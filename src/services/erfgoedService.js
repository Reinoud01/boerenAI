/**
 * Erfgoed Service — Rijksmonumenten + Cultuurhistorie (RCE via PDOK)
 *
 * Rijksmonumenten:
 *   PDOK RCE WFS — https://service.pdok.nl/cultureelerfgoed/rce/wfs/v1_0
 *   Geen API-key vereist.
 *   Layers:
 *     - rce:Rijksmonumenten (punt — individuele monumenten)
 *     - rce:beschermd_gezicht (vlak — beschermde stads- en dorpsgezichten)
 *
 * Cultuurhistorische Waardenkaart (CHW):
 *   PDOK: https://service.pdok.nl/rce/
 *   Layer: historisch_geografisch (historische percelen, erven, hofstedes)
 *
 * Impact op scenario's:
 *   - Rijksmonument op erf → extra toetsing welstand, monumentenwacht verplicht
 *   - Beschermd gezicht → sloopvergunning moeilijker, bestemmingswijziging complexer
 *   - Historisch erf/hofstede → extra informatie voor NSW landgoed scenario
 */

const RCE_WFS   = 'https://service.pdok.nl/cultureelerfgoed/rce/wfs/v1_0'

// ─────────────────────────────────────────────────────────────────────────────
// RIJKSMONUMENTEN
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check of er Rijksmonumenten aanwezig zijn op/nabij de locatie.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} bufferM — zoekradius in meter (default 200m)
 * @returns {Promise<MonumentResult>}
 */
export async function checkRijksmonumenten(lat, lng, bufferM = 200) {
  const buffer = bufferM / 111320  // graden (1° ≈ 111.320 km)

  const params = new URLSearchParams({
    service:      'WFS',
    version:      '2.0.0',
    request:      'GetFeature',
    typeNames:    'rce:Rijksmonumenten',
    outputFormat: 'application/json',
    srsName:      'EPSG:4326',
    bbox:         `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer},EPSG:4326`,
    count:        '10',
  })

  try {
    const res = await fetch(`${RCE_WFS}?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null

    const data    = await res.json()
    const features = data.features || []

    if (features.length === 0) {
      return {
        aanwezig:   false,
        aantal:     0,
        monumenten: [],
        toelichting:'Geen Rijksmonumenten op of nabij dit erf.',
      }
    }

    const monumenten = features.map(f => ({
      naam:            f.properties?.naam          || f.properties?.NAAM     || 'Monument',
      monumentnummer:  f.properties?.monumentnummer|| f.properties?.MONRNR   || null,
      omschrijving:    f.properties?.omschrijving  || f.properties?.OMSCHR   || '',
      categorie:       f.properties?.categorieom   || f.properties?.CATOM    || '',
    }))

    return {
      aanwezig:   true,
      aantal:     monumenten.length,
      monumenten,
      toelichting:`⚠️ ${monumenten.length} Rijksmonument(en) op/nabij het erf: ${monumenten.map(m => m.naam).slice(0, 2).join(', ')}. Verbouw, sloop en bestemmingswijziging vereisen vergunning én toetsing door monumentenwacht.`,
    }
  } catch (e) {
    console.warn('[Erfgoed] RCE Rijksmonumenten WFS mislukt:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BESCHERMD STADS- EN DORPSGEZICHT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check of de locatie in een beschermd stads- of dorpsgezicht ligt.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<GezichtResult|null>}
 */
export async function checkBeschermdeGezichten(lat, lng) {
  const buffer = 0.002  // ~200m

  const params = new URLSearchParams({
    service:      'WFS',
    version:      '2.0.0',
    request:      'GetFeature',
    typeNames:    'rce:beschermd_gezicht',
    outputFormat: 'application/json',
    srsName:      'EPSG:4326',
    bbox:         `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer},EPSG:4326`,
    count:        '3',
  })

  try {
    const res = await fetch(`${RCE_WFS}?${params}`, {
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return null

    const data     = await res.json()
    const features = data.features || []

    if (features.length === 0) {
      return { aanwezig: false, naam: null, toelichting: 'Niet in beschermd stads- of dorpsgezicht.' }
    }

    const naam = features[0].properties?.naam || features[0].properties?.NAAM || 'Beschermd gezicht'
    return {
      aanwezig:    true,
      naam,
      aantal:      features.length,
      toelichting: `⚠️ Locatie ligt in beschermd gezicht "${naam}". Sloop en functieverandering zijn extra getoetst — welstandseisen en monumentenbeleid van toepassing.`,
    }
  } catch (e) {
    console.warn('[Erfgoed] RCE beschermde gezichten WFS mislukt:', e.message)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORISCHE ERVEN / CHW
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check of de locatie samenvalt met een historisch erf, hofstede of cultuurhistorisch
 * waardevol gebied (CHW).
 * Gebruikt de RCE Cultuurhistorische Waardenkaart — laag historische geografie.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<ChwResult|null>}
 */
export async function checkCultuurhistorie(lat, lng) {
  const buffer = 0.003

  // RCE heeft meerdere lagen — probeer 'historisch_geografisch' of vergelijkbaar
  const params = new URLSearchParams({
    service:      'WFS',
    version:      '2.0.0',
    request:      'GetFeature',
    typeNames:    'rce:historische_geografische_elementen',
    outputFormat: 'application/json',
    srsName:      'EPSG:4326',
    bbox:         `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer},EPSG:4326`,
    count:        '5',
  })

  try {
    const res = await fetch(`${RCE_WFS}?${params}`, {
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return null

    const data     = await res.json()
    const features = data.features || []

    if (features.length === 0) {
      return { aanwezig: false, elementen: [], toelichting: 'Geen cultuurhistorische elementen in directe omgeving.' }
    }

    const elementen = features.map(f => f.properties?.naam || f.properties?.omschrijving || 'CHW-element').filter(Boolean)

    return {
      aanwezig:   true,
      aantalElementen: features.length,
      elementen,
      toelichting: `Cultuurhistorische waarden aanwezig: ${elementen.slice(0, 2).join(', ')}. Relevant voor NSW-landgoed en erftransformatie.`,
    }
  } catch (e) {
    console.warn('[Erfgoed] RCE cultuurhistorie WFS mislukt:', e.message)
    return null
  }
}

/**
 * Voer alle erfgoed-checks parallel uit.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{monument, beschermdGezicht, cultuurhistorie}>}
 */
export async function runErfgoedChecks(lat, lng) {
  const [monument, beschermdGezicht, cultuurhistorie] = await Promise.all([
    checkRijksmonumenten(lat, lng),
    checkBeschermdeGezichten(lat, lng),
    checkCultuurhistorie(lat, lng),
  ])
  return { monument, beschermdGezicht, cultuurhistorie }
}
