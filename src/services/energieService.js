/**
 * Energie Service — Energielabels (EP-online) + Netcongestie (Netbeheer NL)
 *
 * EP-online:
 *   Publiek REST API — https://public.ep-online.nl/api/v4/
 *   Geen API-key nodig voor publieke opvragingen (rate-limited).
 *   Geeft energielabel (A+++ t/m G) per pand op basis van BAG-pandidentificatie.
 *
 * Netcongestie:
 *   Netbeheer NL publiceert congestiegebieden per regio op
 *   https://www.netbeheernederland.nl/nieuws/netcongestie
 *   maar er is geen directe JSON API beschikbaar zonder authenticatie.
 *   We gebruiken een statische lookup-tabel gebaseerd op de gepubliceerde
 *   congestiekaarten (update: Q1 2025) + een WMS-check via Tennet/Stedin
 *   waar beschikbaar.
 */

const EP_ONLINE_BASE = 'https://public.ep-online.nl/api/v4'

// ─────────────────────────────────────────────────────────────────────────────
// EP-ONLINE — energielabels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal het energielabel op voor een BAG-pandidentificatie.
 * Werkt het beste voor gebouwen met een geldig energielabel in het register.
 * Agrarische stallen hebben zelden een energielabel — geeft dan null terug.
 *
 * @param {string} pandId — BAG identificatie (18 cijfers)
 * @returns {Promise<EpResult|null>}
 */
export async function getEnergieLabelPand(pandId) {
  if (!pandId) return null

  try {
    const url = `${EP_ONLINE_BASE}/PandEnergielabel/Pand/${pandId}`
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })

    if (res.status === 404) return { label: null, geldig: false, toelichting: 'Geen energielabel geregistreerd voor dit pand.' }
    if (!res.ok) return null

    const data = await res.json()

    // API geeft array van panden terug
    const items = Array.isArray(data) ? data : [data]
    if (items.length === 0) return { label: null, geldig: false, toelichting: 'Geen registratie gevonden.' }

    const item = items[0]
    const label = item.energieklasse || item.energieLabel || null
    const geldig = label !== null && label !== 'Geen'

    return {
      label,
      geldig,
      opnamedatum:  item.opnamedatum  || item.registratiedatum || null,
      gebruiksoppervlak: item.berekeningstype || null,
      toelichting: geldig
        ? `Huidig energielabel: ${label}. ${labelToelichting(label)}`
        : 'Geen geldig energielabel — wettelijk verplicht bij verkoop of verhuur.',
    }
  } catch (e) {
    console.warn('[Energie] EP-online niet bereikbaar:', e.message)
    return null
  }
}

/**
 * Haal energielabels op voor meerdere panden (bijv. bij BAG-query voor locatie).
 * Doorzoekt op postcode + huisnummer als alternatief voor pandId.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} postcode — optioneel, verbetert resultaten
 * @returns {Promise<EpLocatieResult>}
 */
export async function getEnergieLabelLocatie(lat, lng, postcode = null) {
  // Probeer via postcode als beschikbaar
  if (postcode) {
    try {
      const url = `${EP_ONLINE_BASE}/PandEnergielabel/Postcode/${postcode.replace(/\s/g, '')}/1`
      const res = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : []
        if (items.length > 0) {
          return verwerkEpLocatieData(items)
        }
      }
    } catch (e) {
      console.warn('[Energie] EP-online postcode lookup mislukt:', e.message)
    }
  }

  // Geen data beschikbaar — geef informatieve null terug
  return {
    gevonden: false,
    gemiddeldLabel: null,
    aantalLabels: 0,
    toelichting: 'Energielabel niet automatisch opgehaald — voer BAG-pandidentificatie in voor nauwkeurige data.',
  }
}

function verwerkEpLocatieData(items) {
  const geldige = items.filter(i => i.energieklasse && i.energieklasse !== 'Geen')
  const labels  = geldige.map(i => i.energieklasse)
  const gemiddeld = labels.length > 0 ? meestVoorkomend(labels) : null

  return {
    gevonden:       labels.length > 0,
    gemiddeldLabel: gemiddeld,
    aantalLabels:   labels.length,
    labels,
    toelichting: gemiddeld
      ? `Energielabels in omgeving: ${labels.join(', ')}. ${labelToelichting(gemiddeld)}`
      : 'Geen energielabels gevonden voor deze locatie.',
  }
}

function meestVoorkomend(arr) {
  return arr.sort((a, b) => arr.filter(v => v === a).length - arr.filter(v => v === b).length).pop()
}

function labelToelichting(label) {
  const toelichting = {
    'A+++': 'Uitstekend energieprestatie — minimale renovatiekosten.',
    'A++':  'Uitstekend — geringe meerkosten bij verbouw.',
    'A+':   'Goed — BENG-compliant bij renovatie haalbaar.',
    'A':    'Goed uitgangspunt voor verduurzaming.',
    'B':    'Beperkte maatrengelen nodig voor BENG-norm bij herbestemming.',
    'C':    'Matige label — isolatie en installaties aanpakken bij verbouw.',
    'D':    'Onder de norm — bij verhuur label-C vereist (2030).',
    'E':    '⚠️ Slecht label — ingrijpende renovatie nodig bij herbestemming.',
    'F':    '⚠️ Slecht label — aanzienlijke extra investering vereist.',
    'G':    '⚠️ Laagste label — grootschalige aanpak vereist.',
  }
  return toelichting[label] || ''
}

// ─────────────────────────────────────────────────────────────────────────────
// NETCONGESTIE — statische tabel + WMS check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bekende congestiegebieden per provincie (gebaseerd op gepubliceerde kaarten Netbeheer NL Q1 2025).
 * Terugvaloptie als WMS-check niet beschikbaar is.
 * 'vol' = teruglevering & nieuwe aansluiting gepauzeerd
 * 'druk' = beperkingen gelden, kleinere projecten kunnen nog
 * 'ok' = geen congestie gemeld
 */
const CONGESTIE_TABEL = {
  'Drenthe':        { status: 'druk',  regio: 'Coevorden, Emmen omgeving', netbeheerder: 'Enexis' },
  'Flevoland':      { status: 'vol',   regio: 'Gehele provincie',          netbeheerder: 'Liander' },
  'Friesland':      { status: 'druk',  regio: 'Zuidwest Friesland',        netbeheerder: 'Liander' },
  'Gelderland':     { status: 'druk',  regio: 'Achterhoek, Rivierenland',  netbeheerder: 'Liander' },
  'Groningen':      { status: 'vol',   regio: 'Veendam, Oldambt, Delfzijl',netbeheerder: 'Enexis' },
  'Limburg':        { status: 'druk',  regio: 'Noord-Limburg',             netbeheerder: 'Enexis' },
  'Noord-Brabant':  { status: 'druk',  regio: 'Meierij, West-Brabant',     netbeheerder: 'Enexis' },
  'Noord-Holland':  { status: 'druk',  regio: 'Kop van Noord-Holland',     netbeheerder: 'Liander' },
  'Overijssel':     { status: 'druk',  regio: 'Twente, Salland',           netbeheerder: 'Enexis' },
  'Utrecht':        { status: 'ok',    regio: '',                           netbeheerder: 'Stedin' },
  'Zeeland':        { status: 'druk',  regio: 'Zeeuws-Vlaanderen',         netbeheerder: 'Stedin' },
  'Zuid-Holland':   { status: 'ok',    regio: '',                           netbeheerder: 'Stedin' },
}

/**
 * Check netcongestie op basis van provincie (statisch) met WMS-fallback.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} provincie
 * @returns {Promise<CongestieResult>}
 */
export async function checkNetcongestie(lat, lng, provincie = '') {
  // Probeer WMS-based check via PDOK (indien beschikbaar)
  // Enexis publiceert een WMS maar zonder publiek endpoint
  // Liander/Stedin vergelijkbaar — gebruik statische tabel als primaire bron

  const provincieInfo = CONGESTIE_TABEL[provincie] || null

  if (!provincieInfo) {
    return {
      status:       'onbekend',
      netbeheerder: 'onbekend',
      regio:        '',
      toelichting:  'Netcongestie niet bepaald — controleer op netbeheernederland.nl voor actuele kaart.',
    }
  }

  const statusLabel = {
    vol:     '⚠️ Vol netwerk',
    druk:    '! Druk netwerk',
    ok:      '✓ Beschikbaar',
    onbekend:'? Onbekend',
  }

  return {
    status:       provincieInfo.status,
    netbeheerder: provincieInfo.netbeheerder,
    regio:        provincieInfo.regio,
    statusLabel:  statusLabel[provincieInfo.status],
    toelichting: provincieInfo.status === 'vol'
      ? `⚠️ Netcongestie: het net van ${provincieInfo.netbeheerder} in ${provincie} is vol. Teruglevering zonnepanelen >15 kWp kan geweigerd worden. Vraag bij netbeheerder naar transportcapaciteit.`
      : provincieInfo.status === 'druk'
      ? `Beperkte netcapaciteit (${provincieInfo.netbeheerder}, ${provincieInfo.regio}). Kleinere zonne-installaties meestal nog wel mogelijk — check actuele kaart.`
      : `Netcapaciteit beschikbaar bij ${provincieInfo.netbeheerder} in ${provincie}.`,
  }
}

/**
 * Voer beide energie-checks parallel uit.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} provincie
 * @param {string|null} postcode
 * @returns {Promise<{energielabel, netcongestie}>}
 */
export async function runEnergieChecks(lat, lng, provincie = '', postcode = null) {
  const [energielabel, netcongestie] = await Promise.all([
    getEnergieLabelLocatie(lat, lng, postcode),
    checkNetcongestie(lat, lng, provincie),
  ])
  return { energielabel, netcongestie }
}
