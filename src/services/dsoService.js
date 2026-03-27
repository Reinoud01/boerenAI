/**
 * DSO Service — Laag 2: Omgevingswet / Ruimtelijke bestemmingsdata
 *
 * Primair: Ruimtelijke Plannen API v4 (geen API-key vereist, geldig tot 2032 overgangsrecht)
 * Documentatie: https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4/
 *
 * Aanpak:
 * 1. getBestemmingsvlak(lat, lng) → huidige bestemming op locatie
 * 2. getBestemmingInfo(bestemmingen) → interpreteer bestemmingen naar scenario-relevante flags
 */

const RP_API_BASE = 'https://ruimte.omgevingswet.overheid.nl/ruimtelijke-plannen/api/opvragen/v4'

/**
 * Haal het bestemmingsvlak op voor een gegeven coördinaat.
 * Geeft de plannen terug die op of nabij de locatie gelden.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<DSOResult|null>}
 */
export async function getBestemmingVlak(lat, lng) {
  // Kleine buffer (ca. 50m) voor betrouwbaarheid
  const buffer = 0.0005

  // Stap 1: Zoek relevante plannen op locatie
  const plannenUrl = `${RP_API_BASE}/plannen?_geo.intersects.bbox=${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}&planType=bestemmingsplan,omgevingsplan&pageSize=5`

  let planIds = []
  try {
    const res = await fetch(plannenUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      const data = await res.json()
      planIds = (data._embedded?.plannen || []).map(p => p.id)
    }
  } catch (e) {
    console.warn('DSO plannen ophalen mislukt:', e.message)
  }

  if (planIds.length === 0) {
    return await getBestemmingViaLocatie(lat, lng)
  }

  // Stap 2: Haal bestemmingsvlakken op voor het eerste gevonden plan
  const planId = planIds[0]
  return await getBestemmingVoorPlan(planId, lat, lng)
}

/**
 * Haal bestemmingsvlakken op voor een specifiek plan op een locatie
 */
async function getBestemmingVoorPlan(planId, lat, lng) {
  const buffer = 0.0005
  const url = `${RP_API_BASE}/plannen/${planId}/bestemmingsvlakken?_geo.intersects.bbox=${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}&pageSize=10`

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const vlakken = data._embedded?.bestemmingsvlakken || []
    return parseBestemmingen(vlakken, planId)
  } catch (e) {
    console.warn('DSO bestemmingsvlakken ophalen mislukt:', e.message)
    return null
  }
}

/**
 * Fallback: zoek direct via locatie-endpoint
 */
async function getBestemmingViaLocatie(lat, lng) {
  // Alternatief: gebruik het /plannen endpoint met puntlocatie
  const url = `${RP_API_BASE}/plannen?_geo.contains=POINT(${lng} ${lat})&planType=bestemmingsplan,omgevingsplan&pageSize=3`
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const plannen = data._embedded?.plannen || []
    if (plannen.length === 0) return null

    // Probeer het meest recente / meest relevante plan
    const plan = plannen[0]
    return await getBestemmingVoorPlan(plan.id, lat, lng)
  } catch (e) {
    console.warn('DSO locatie-fallback mislukt:', e.message)
    return null
  }
}

/**
 * Verwerk ruwe bestemmingsvlak-data naar bruikbaar resultaat
 */
function parseBestemmingen(vlakken, planId) {
  if (vlakken.length === 0) return null

  const bestemmingen = vlakken.map(v => {
    const naam = v.naam || v.bestemmingshoofdgroep || v.type || 'onbekend'
    return {
      naam,
      type: v.type || v.bestemmingshoofdgroep || null,
      artikelnummer: v.artikelnummer || null,
    }
  })

  const hoofdbestemming = bestemmingen[0]
  const flags = interpreteerBestemming(bestemmingen)

  return {
    planId,
    bestemmingen,
    hoofdbestemming: hoofdbestemming.naam,
    ...flags,
  }
}

/**
 * Interpreteer bestemmingen naar scenario-relevante boolean-flags
 * die de scenarioEngine kan gebruiken.
 */
function interpreteerBestemming(bestemmingen) {
  const namen = bestemmingen.map(b => b.naam?.toLowerCase() || '')
  const types = bestemmingen.map(b => b.type?.toLowerCase() || '')
  const alles = [...namen, ...types].join(' ')

  return {
    // Huidige functies
    isAgrarisch: /agrarisch|akkerbouw|veehouderij|glastuinbouw|tuinbouw/.test(alles),
    isWonen: /wonen|woongebied|woondoeleinden/.test(alles),
    isNatuur: /natuur|bos|groen|ecologisch/.test(alles),
    isRecreatie: /recreatie|verblijfsrecreatie|dagrecreatie/.test(alles),
    isBedrijf: /bedrijf|bedrijventerrein|kantoor/.test(alles),

    // Transitie-haalbaarheid indicatoren
    kanFunctiewijzigingWonen: /agrarisch/.test(alles) && !/natura2000|nnn|ecologisch/.test(alles),
    kanRecreatie: /agrarisch|groen/.test(alles),
    heeftVABmogelijkheid: /agrarisch/.test(alles), // Vrijkomende Agrarische Bebouwing

    // Beperkingen
    isGeschermdeGebied: /natura2000|nnn|natuur netwerk|waterkeringen|waterstaat/.test(alles),
    isInfrastructuur: /verkeer|spoor|water|waterloop/.test(alles),
  }
}

/**
 * Haal de bestemmingsomschrijving op voor een specifiek perceel (via geometry bbox)
 * Dit is de hoofdfunctie die vanuit Stap1Kaart wordt aangeroepen na perceel-selectie.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<DSOResult|null>}
 */
export async function checkBestemmingPerceel(lat, lng) {
  try {
    return await getBestemmingVlak(lat, lng)
  } catch (e) {
    console.warn('DSO check mislukt:', e)
    return null
  }
}

/**
 * Batch-check: controleer de bestemming voor het centrum van alle geselecteerde percelen
 * en geef een samenvattend resultaat terug.
 *
 * @param {Array} percelen - array van perceel-objecten met geometry
 * @returns {Promise<DSOSummary>}
 */
export async function checkBestemmingPercelen(percelen) {
  if (!percelen || percelen.length === 0) return null

  const resultaten = []

  for (const perceel of percelen.slice(0, 3)) {
    // Max 3 percelen checken om API-calls te beperken
    if (!perceel.geometry) continue
    const center = getCenterVanGeometry(perceel.geometry)
    if (!center) continue
    const result = await checkBestemmingPerceel(center.lat, center.lng)
    if (result) resultaten.push(result)
    // Kleine pauze om API niet te overbelasten
    await new Promise(r => setTimeout(r, 300))
  }

  if (resultaten.length === 0) return null

  // Samenvatting: neem meest voorkomende flags
  return {
    aantalGecheckt: resultaten.length,
    hoofdbestemming: resultaten[0]?.hoofdbestemming || 'onbekend',
    bestemmingen: resultaten.flatMap(r => r.bestemmingen || []),
    isAgrarisch: resultaten.some(r => r.isAgrarisch),
    isNatuur: resultaten.some(r => r.isNatuur),
    kanFunctiewijzigingWonen: resultaten.every(r => r.kanFunctiewijzigingWonen),
    kanRecreatie: resultaten.every(r => r.kanRecreatie),
    heeftVABmogelijkheid: resultaten.some(r => r.heeftVABmogelijkheid),
    isGeschermdeGebied: resultaten.some(r => r.isGeschermdeGebied),
    bronPlanIds: [...new Set(resultaten.map(r => r.planId).filter(Boolean))],
  }
}

/**
 * Hulpfunctie: bereken het middelpunt van een GeoJSON geometry
 */
function getCenterVanGeometry(geometry) {
  if (!geometry) return null
  try {
    let coords = []
    if (geometry.type === 'Point') {
      coords = [geometry.coordinates]
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0]
    }
    if (coords.length === 0) return null
    const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length
    const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length
    return { lat: avgLat, lng: avgLng }
  } catch {
    return null
  }
}
