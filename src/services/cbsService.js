/**
 * CBS Service — Demografische & woningmarktdata (CBS Statline OData v4)
 *
 * CBS OData v4 API — geen API-key vereist.
 * Documentatie: https://www.cbs.nl/nl-nl/onze-diensten/open-data/statline-als-open-data/quick-start-guide
 * Basis-URL: https://odata4.cbs.nl/CBS/
 *
 * Datasets gebruikt:
 *   - 70072NED  — Bevolkingsontwikkeling gemeente (jaarlijks)
 *     → bevolkingsgroei, krimp, vergrijzing indicator
 *   - 83625NED  — Woningbouw; bouwvergunningen (aantal per gemeente)
 *     → woningdruk indicator (hoge druk = gunstig voor VAB-wonen)
 *   - 84583NED  — Woningwaarde WOZ per gemeente
 *     → WOZ-waarde als proxy voor grondprijs en investeringsklimaat
 *
 * Impact op scenario's:
 *   - Hoge woningdruk (weinig vergunningen / veel bevolkingsgroei)
 *     → verhoogt haalbaarheid VAB Woningbouw
 *   - Bevolkingskrimp
 *     → verlaagt haalbaarheid VAB Wonen, verhoogt haalbaarheid natuur/landgoed
 *   - Hoge WOZ → hogere grondwaarde → betere verkoopopbrengst inschatting
 */

const CBS_ODATA = 'https://odata4.cbs.nl/CBS'

// CBS gemeente-ID mapping (gemeentenummer → naam, top 50 agrarische gemeenten)
// CBS gebruikt viercijferige gemeentecodes (GM + 4 cijfers)
// We zoeken op naam via $filter

// ─────────────────────────────────────────────────────────────────────────────
// Bevolkingsontwikkeling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal bevolkingsontwikkelingsdata op voor een gemeente.
 * Dataset: 70072NED — Bevolkingsontwikkeling; gemeente
 *
 * @param {string} gemeente — gemeentenaam (zoals teruggegeven door PDOK)
 * @returns {Promise<BevolkingResult|null>}
 */
export async function getBevolkingData(gemeente) {
  if (!gemeente) return null

  // CBS gebruikt gemeentenamen soms anders — normaliseer
  const gemeenteNorm = normaliseerGemeente(gemeente)

  try {
    // Haal meest recente jaar op voor de gemeente
    const filter = encodeURIComponent(`contains(RegioS,'${gemeenteNorm}') and Perioden gt '2022JJ00'`)
    const url    = `${CBS_ODATA}/70072NED/Observations?$filter=${filter}&$select=RegioS,Perioden,TotaleBevolking_1,GeboorteEnSterftesaldo_10,Bevolkingsgroei_16&$top=5&$orderby=Perioden desc`

    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data  = await res.json()
    const items = data.value || []
    if (items.length === 0) return null

    const recent = items[0]
    const groei  = parseFloat(recent.Bevolkingsgroei_16) || 0
    const saldo  = parseFloat(recent.GeboorteEnSterftesaldo_10) || 0

    return {
      gemeente:     gemeenteNorm,
      periode:      recent.Perioden,
      bevolking:    parseInt(recent.TotaleBevolking_1) || null,
      groeiPct:     groei,
      groeisaldo:   saldo,
      trend:        groei > 0.5 ? 'groei' : groei < -0.3 ? 'krimp' : 'stabiel',
      toelichting:  bevolkingToelichting(groei, gemeenteNorm),
    }
  } catch (e) {
    console.warn('[CBS] Bevolkingsdata niet beschikbaar:', e.message)
    return null
  }
}

function bevolkingToelichting(groei, gemeente) {
  if (groei > 1.0)  return `${gemeente} groeit sterk (+${groei.toFixed(1)}%/jr) — hoge woningvraag, gunstig voor VAB-wonen en verhuur.`
  if (groei > 0.3)  return `${gemeente} groeit gematigd (+${groei.toFixed(1)}%/jr) — stabiele woningvraag.`
  if (groei > -0.3) return `${gemeente} is stabiel qua bevolking — lokale marktanalyse aanbevolen.`
  return `${gemeente} heeft bevolkingskrimp (${groei.toFixed(1)}%/jr) — VAB-wonen minder kansrijk, overweeg natuur/landgoed.`
}

// ─────────────────────────────────────────────────────────────────────────────
// Woningbouwdruk (bouwvergunningen)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal woningbouwvergunningen op als indicator voor woningdruk.
 * Dataset: 83625NED — Woningbouw; bouwvergunningen
 *
 * @param {string} gemeente
 * @returns {Promise<WoningdrukResult|null>}
 */
export async function getWoningdruk(gemeente) {
  if (!gemeente) return null

  const gemeenteNorm = normaliseerGemeente(gemeente)

  try {
    const filter = encodeURIComponent(`contains(RegioS,'${gemeenteNorm}') and Perioden gt '2022KW00'`)
    const url    = `${CBS_ODATA}/83625NED/Observations?$filter=${filter}&$select=RegioS,Perioden,ToegegevenVergunningen_1&$top=4&$orderby=Perioden desc`

    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data  = await res.json()
    const items = data.value || []
    if (items.length === 0) return null

    // Som van de laatste 4 kwartalen
    const totaal = items.reduce((s, i) => s + (parseInt(i.ToegegevenVergunningen_1) || 0), 0)
    const trend  = totaal > 100 ? 'hoog' : totaal > 30 ? 'gemiddeld' : 'laag'

    return {
      gemeente:   gemeenteNorm,
      vergunningenJaar: totaal,
      trend,
      toelichting: woningdrukToelichting(trend, totaal, gemeenteNorm),
    }
  } catch (e) {
    console.warn('[CBS] Woningbouwdata niet beschikbaar:', e.message)
    return null
  }
}

function woningdrukToelichting(trend, totaal, gemeente) {
  if (trend === 'hoog')     return `Hoge bouwactiviteit in ${gemeente} (${totaal} vergunningen/jr) — sterke vraag naar woningen, gunstig voor VAB-wonen en verhuur.`
  if (trend === 'gemiddeld') return `Gemiddelde bouwactiviteit in ${gemeente} (${totaal} vergunningen/jr) — stabiele woningmarkt.`
  return `Lage bouwactiviteit in ${gemeente} (${totaal} vergunningen/jr) — beperkte woningvraag. Overweeg alternatieve scenario's.`
}

// ─────────────────────────────────────────────────────────────────────────────
// WOZ-waarde (grondwaardeproxy)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal gemiddelde WOZ-waarde op als proxy voor investeringsklimaat.
 * Dataset: 84583NED — Gemiddelde WOZ-waarde woningen
 *
 * @param {string} gemeente
 * @returns {Promise<WozResult|null>}
 */
export async function getWozWaarde(gemeente) {
  if (!gemeente) return null

  const gemeenteNorm = normaliseerGemeente(gemeente)

  try {
    const filter = encodeURIComponent(`contains(RegioS,'${gemeenteNorm}') and Perioden gt '2022JJ00'`)
    const url    = `${CBS_ODATA}/84583NED/Observations?$filter=${filter}&$select=RegioS,Perioden,GemiddeldeWOZWaarde_1&$top=3&$orderby=Perioden desc`

    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal:  AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data  = await res.json()
    const items = data.value || []
    if (items.length === 0) return null

    const woz    = parseInt(items[0].GemiddeldeWOZWaarde_1) || null
    const niveau = woz ? (woz > 400000 ? 'hoog' : woz > 250000 ? 'gemiddeld' : 'laag') : 'onbekend'

    return {
      gemeente:  gemeenteNorm,
      wozGemiddeld: woz,
      niveau,
      toelichting: woz
        ? `Gem. WOZ-waarde ${gemeente}: €${(woz / 1000).toFixed(0)}k — ${wozToelichting(niveau)}`
        : 'WOZ-waarde niet beschikbaar.',
    }
  } catch (e) {
    console.warn('[CBS] WOZ-data niet beschikbaar:', e.message)
    return null
  }
}

function wozToelichting(niveau) {
  if (niveau === 'hoog')     return 'hoge grondwaarden — verkoop en kavelbijdrage gunstig.'
  if (niveau === 'gemiddeld') return 'gemiddeld vastgoedklimaat — normale marktverwachtingen.'
  return 'lagere vastgoedwaarden — investeringsrendement kritisch door te rekenen.'
}

// ─────────────────────────────────────────────────────────────────────────────
// Combinatiefunctie
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal alle CBS-data op in parallel.
 * Graceful degradation: als één endpoint faalt, gaan de anderen door.
 *
 * @param {string} gemeente
 * @returns {Promise<{bevolking, woningdruk, woz}>}
 */
export async function runCbsChecks(gemeente) {
  const [bevolking, woningdruk, woz] = await Promise.all([
    getBevolkingData(gemeente).catch(() => null),
    getWoningdruk(gemeente).catch(() => null),
    getWozWaarde(gemeente).catch(() => null),
  ])

  return { bevolking, woningdruk, woz }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normaliseer gemeentenaam voor CBS-filter.
 * CBS gebruikt soms kortere namen of weglaten van 'Gemeente '.
 */
function normaliseerGemeente(naam) {
  return naam
    .replace(/^Gemeente\s+/i, '')
    .replace(/\s+gemeente$/i, '')
    .split(' ')[0]  // Gebruik eerste woord voor betrouwbaardere CBS-match
}
