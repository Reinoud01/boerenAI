/**
 * Milieu Service — Stikstof (AERIUS/RIVM) + Bodemkwaliteit (BRO)
 *
 * Stikstof:
 *   PDOK/RIVM publiceert de kritische depositiewaarden (KDW) als WMS.
 *   Omdat AERIUS-berekeningen een volledige API-key + job vereisen, gebruiken
 *   we twee benaderingen:
 *   1. PDOK RIVM stikstofdepositie WFS (overbelaste hectares per gebied)
 *   2. Als fallback: combinatie van Natura2000-nabijheid + bedrijfstype
 *      → geeft een indicatief "stikstof-risico" terug
 *
 * BRO (Basisregistratie Ondergrond):
 *   Publiek REST API — https://publiek.broservices.nl/
 *   Gebruikt: Booronderzoek (BHR-P) voor grondtype + grondwaterstand indicatie
 *   én Milieuhygiënisch Bodemonderzoek (SAR) voor sanerings-alerts.
 */

const BRO_API   = 'https://publiek.broservices.nl'
const RIVM_WFS  = 'https://service.pdok.nl/rivm/stikstof/wfs/v1_0'

// ─────────────────────────────────────────────────────────────────────────────
// STIKSTOF
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controleer of de locatie in een stikstof-overbelast gebied ligt.
 * Gebruikt PDOK RIVM stikstofkaart WFS (OPS-model gebieden).
 *
 * @param {number} lat
 * @param {number} lng
 * @param {boolean} nabijNatura2000 — al bepaald door pdokService
 * @returns {Promise<StikstofResult>}
 */
export async function checkStikstof(lat, lng, nabijNatura2000 = false) {
  // Probeer PDOK RIVM WFS stikstofbelasting (depositie overbelasting N2000)
  const buffer = 0.005  // ~500m buffer
  const params = new URLSearchParams({
    service:      'WFS',
    version:      '2.0.0',
    request:      'GetFeature',
    typeNames:    'stikstof:natura2000_overbelasting',
    outputFormat: 'application/json',
    srsName:      'EPSG:4326',
    bbox:         `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer},EPSG:4326`,
    count:        '3',
  })

  try {
    const res = await fetch(`${RIVM_WFS}?${params}`, {
      signal: AbortSignal.timeout(6000),
    })

    if (res.ok) {
      const data = await res.json()
      const features = data.features || []
      if (features.length > 0) {
        const namen = features.map(f => f.properties?.naam || f.properties?.NAAM || 'gebied').filter(Boolean)
        return {
          overbelast:      true,
          kritischGebied:  true,
          gebiedsnamen:    namen,
          bron:            'RIVM PDOK',
          toelichting:     `Locatie ligt in of nabij stikstof-overbelast Natura 2000-gebied: ${namen.slice(0, 2).join(', ')}.`,
        }
      }
      // WFS werkt maar geen overlap → niet overbelast in directe omgeving
      return {
        overbelast:     false,
        kritischGebied: nabijNatura2000,
        gebiedsnamen:   [],
        bron:           'RIVM PDOK',
        toelichting:    nabijNatura2000
          ? 'Nabij Natura 2000-gebied — stikstofruimte is beperkt, laat berekening maken via AERIUS.'
          : 'Geen directe stikstof-overbelasting gedetecteerd op deze locatie.',
      }
    }
  } catch (e) {
    // WFS niet beschikbaar — fallback op N2000-nabijheid
    console.warn('[Milieu] RIVM stikstof WFS niet beschikbaar:', e.message)
  }

  // Fallback: inschatting op basis van Natura 2000-nabijheid
  return {
    overbelast:     nabijNatura2000,
    kritischGebied: nabijNatura2000,
    gebiedsnamen:   [],
    bron:           'indicatief (Natura 2000 proxy)',
    toelichting:    nabijNatura2000
      ? 'Locatie ligt nabij Natura 2000 — stikstofberekening via AERIUS.nl aanbevolen.'
      : 'Geen stikstof-overbelasting verwacht op basis van ligging.',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BRO — Bodemkwaliteit & grondwater
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal BRO booronderzoeken op in de buurt van de locatie.
 * Geeft een indicatie van grondtype en grondwaterstand.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<BodemResult>}
 */
export async function checkBodem(lat, lng) {
  // BRO Booronderzoek (BHR-P) — publiek, geen key vereist
  // https://publiek.broservices.nl/bhrp/v2/objects/search
  const url = `${BRO_API}/bhrp/v2/objects?boundingBox.lowerCorner.lat=${lat - 0.005}&boundingBox.lowerCorner.lon=${lng - 0.005}&boundingBox.upperCorner.lat=${lat + 0.005}&boundingBox.upperCorner.lon=${lng + 0.005}&observationType=geotechnical&limit=5`

  let booronderzoeken = []

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) })
    if (res.ok) {
      const data = await res.json()
      booronderzoeken = (data.documenten || []).slice(0, 5)
    }
  } catch (e) {
    console.warn('[Milieu] BRO booronderzoek niet beschikbaar:', e.message)
  }

  // BRO Milieuhygiënisch bodemonderzoek (SAR) — check op sanering
  let saneringAlert = false
  try {
    const sarUrl = `${BRO_API}/sar/v1/objects?boundingBox.lowerCorner.lat=${lat - 0.003}&boundingBox.lowerCorner.lon=${lng - 0.003}&boundingBox.upperCorner.lat=${lat + 0.003}&boundingBox.upperCorner.lon=${lng + 0.003}&limit=3`
    const sarRes = await fetch(sarUrl, { signal: AbortSignal.timeout(6000) })
    if (sarRes.ok) {
      const sarData = await sarRes.json()
      saneringAlert = (sarData.documenten || []).length > 0
    }
  } catch (e) {
    console.warn('[Milieu] BRO sanering check niet beschikbaar:', e.message)
  }

  return {
    bodemonderzoekBeschikbaar: booronderzoeken.length > 0,
    aantalBooronderzoeken:     booronderzoeken.length,
    saneringAlert,
    bron:                      booronderzoeken.length > 0 ? 'BRO (publiek)' : 'BRO niet beschikbaar',
    toelichting: saneringAlert
      ? '⚠️ Er zijn milieuonderzoeken nabij deze locatie — raadpleeg bodemloket.nl vóór functiewijziging.'
      : booronderzoeken.length > 0
      ? `${booronderzoeken.length} booronderzoek(en) in BRO gevonden — grondtype nader te bepalen.`
      : 'Geen BRO-bodemdata beschikbaar in directe omgeving. Verplicht bodemonderzoek bij functiewijziging naar wonen.',
  }
}

/**
 * Voer beide milieu-checks parallel uit.
 * Wordt aangeroepen vanuit Stap1Kaart na pinplaatsing.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {boolean} nabijNatura2000
 * @returns {Promise<{stikstof, bodem}>}
 */
export async function runMilieuChecks(lat, lng, nabijNatura2000 = false) {
  const [stikstof, bodem] = await Promise.all([
    checkStikstof(lat, lng, nabijNatura2000),
    checkBodem(lat, lng),
  ])
  return { stikstof, bodem }
}
