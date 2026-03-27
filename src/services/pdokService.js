/**
 * PDOK Service — perceelsdata en geo-checks
 *
 * BRP Gewaspercelen via OGC API Features:
 *   https://api.pdok.nl/rvo/gewaspercelen/ogc/v1
 *   Collection: brpgewas
 *   bbox: minLng,minLat,maxLng,maxLat (WGS84, direct bruikbaar vanuit Leaflet)
 *
 * WMS overlay laagnaam: BrpGewas
 * WFS laagnaam (niet gebruikt): brpgewaspercelen:BrpGewas (EPSG:28992 native)
 */

const PDOK_BRP_OGC = 'https://api.pdok.nl/rvo/gewaspercelen/ogc/v1'
const PDOK_N2000_WFS = 'https://service.pdok.nl/mlnp/natura2000/wfs/v1_0'
const PDOK_NNN_WFS = 'https://service.pdok.nl/provincies/nnn/wfs/v1_0'
const PDOK_LOCATIESERVER = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1'
const PDOK_BAG_WFS = 'https://service.pdok.nl/lv/bag/wfs/v2_0'

/**
 * Haal gemeente en provincie op via reverse geocoding (PDOK Locatieserver)
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{gemeente: string, provincie: string}|null>}
 */
export async function getGemeenteProvincie(lat, lng) {
  const url = `${PDOK_LOCATIESERVER}/reverse?lat=${lat}&lon=${lng}&type=gemeente,provincie&rows=2`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    const docs = data.response?.docs || []
    const gemeente = docs.find(d => d.type === 'gemeente')?.weergavenaam?.replace(/^Gemeente\s+/i, '') || ''
    const provincie = docs.find(d => d.type === 'provincie')?.weergavenaam?.replace(/^Provincie\s+/i, '') || ''
    return { gemeente, provincie }
  } catch (e) {
    console.warn('PDOK Locatieserver reverse geocode fout:', e.message)
    return null
  }
}

/**
 * Haal BRP perceel op via OGC API op basis van geklikte lat/lng
 * Geeft het eerste perceel terug dat de kliklocatie overlapt (of nabij ligt).
 */
export async function getBRPPerceel(lat, lng) {
  // Kleine bbox rond de kliklocatie (~40m buffer)
  const buffer = 0.0004

  const url = new URL(`${PDOK_BRP_OGC}/collections/brpgewas/items`)
  url.searchParams.set('bbox', `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer}`)
  url.searchParams.set('f', 'json')
  url.searchParams.set('limit', '1')

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      console.warn('BRP OGC API HTTP fout:', res.status)
      return null
    }
    const data = await res.json()
    if (data.features && data.features.length > 0) {
      return parsePerceel(data.features[0])
    }
    return null
  } catch (e) {
    console.warn('BRP OGC API fout:', e.message)
    return null
  }
}

/**
 * Verwerk een OGC API feature naar het interne perceel-formaat
 */
function parsePerceel(feature) {
  const props = feature.properties || {}

  // Bereken hectares uit de polygoongeometrie (geen oppervlakte in OGC API response)
  const ha = calcHectaresVanGeometry(feature.geometry)

  return {
    id: feature.id || `brp-${Math.random().toString(36).slice(2)}`,
    geometry: feature.geometry,       // GeoJSON in WGS84 — direct bruikbaar in Leaflet
    hectares: ha,
    gewas: props.gewas || props.category || 'Agrarisch perceel',
    gewasCode: props.gewascode || null,
    categorie: props.category || '',
    jaar: props.jaar || null,
    gemeente: props.gemeente || '',
    provincie: props.provincie || '',
  }
}

/**
 * Check of gegeven bounding box Natura 2000-gebieden overlapt
 */
export async function checkNatura2000(bbox) {
  if (!bbox) return null

  const { minLng, minLat, maxLng, maxLat } = bbox
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'natura2000:natura2000',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`,
    count: '5',
  })

  try {
    const res = await fetch(`${PDOK_N2000_WFS}?${params}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      aanwezig: data.features && data.features.length > 0,
      gebieden: (data.features || []).map(f => f.properties?.naam || 'Natura 2000-gebied'),
    }
  } catch (err) {
    console.warn('PDOK Natura 2000 WFS fout:', err)
    return null
  }
}

/**
 * Check of gegeven bbox NNN-gebieden overlapt
 */
export async function checkNNN(bbox) {
  if (!bbox) return null

  const { minLng, minLat, maxLng, maxLat } = bbox
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'nnn:nnn',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`,
    count: '5',
  })

  try {
    const res = await fetch(`${PDOK_NNN_WFS}?${params}`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return {
      aanwezig: data.features && data.features.length > 0,
    }
  } catch (err) {
    console.warn('PDOK NNN WFS niet beschikbaar:', err)
    return null
  }
}

/**
 * Bereken bounding box van geselecteerde percelen (voor geo-checks)
 */
export function getBoundingBox(percelen) {
  if (!percelen || percelen.length === 0) return null

  let minLng = Infinity, minLat = Infinity
  let maxLng = -Infinity, maxLat = -Infinity

  percelen.forEach(p => {
    if (!p.geometry) return
    const coords = flattenCoords(p.geometry)
    coords.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    })
  })

  if (minLng === Infinity) return null
  return { minLng, minLat, maxLng, maxLat }
}

// ─────────────────────────────────────────────────────────────────────────────
// BAG — Basisregistraties Adressen en Gebouwen
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haal gebouwen op uit de BAG voor een locatie (straal ~200m).
 * Geeft een gesorteerde lijst van panden terug met oppervlakte en gebruiksfunctie.
 *
 * Gebruikt twee WFS-calls:
 *   1. bag:pand       → gebouwpolygonen + bouwjaar
 *   2. bag:verblijfsobject → gebruiksdoel + officiële oppervlakte per eenheid
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<BagResultaat>}
 */
export async function getBagGebouwen(lat, lng) {
  const buffer = 0.002  // ~200m straal

  const minLng = lng - buffer
  const minLat = lat - buffer
  const maxLng = lng + buffer
  const maxLat = lat + buffer
  const bboxStr = `${minLng},${minLat},${maxLng},${maxLat},EPSG:4326`

  // Voer beide calls parallel uit
  const [panden, verblijfsobjecten] = await Promise.all([
    fetchBagPanden(bboxStr),
    fetchBagVerblijfsobjecten(bboxStr),
  ])

  if (!panden.length) {
    return { gevonden: false, gebouwen: [], samenvatting: null }
  }

  // Bouw een map van pandID → gebruiksdoel + oppervlakte (vanuit verblijfsobjecten)
  const vboMap = {}
  for (const vbo of verblijfsobjecten) {
    const pandId = vbo.pandId
    if (!vboMap[pandId]) vboMap[pandId] = []
    vboMap[pandId].push(vbo)
  }

  // Verrijk panden met verblijfsobject-info
  const gebouwen = panden.map(pand => {
    const vbos = vboMap[pand.id] || []
    const gebruiksdoelen = [...new Set(vbos.flatMap(v => v.gebruiksdoelen))]
    const vboOppervlakte = vbos.reduce((sum, v) => sum + (v.oppervlakte || 0), 0)

    // Gebruik officiële VBO-oppervlakte als beschikbaar, anders berekend uit polygon
    const oppervlakte = vboOppervlakte > 0 ? vboOppervlakte : pand.berekendM2

    // Bepaal categorie
    const categorie = bepaalCategorie(gebruiksdoelen, oppervlakte)

    return {
      id: pand.id,
      oppervlakte: Math.round(oppervlakte),
      bouwjaar: pand.bouwjaar,
      status: pand.status,
      gebruiksdoelen,
      categorie,             // 'woonhuis' | 'bedrijfswoning' | 'stal' | 'schuur' | 'kassen' | 'overig'
      bron: vboOppervlakte > 0 ? 'BAG officieel' : 'BAG berekend',
    }
  }).filter(g => g.oppervlakte > 10 && g.status !== 'Pand gesloopt')
    .sort((a, b) => b.oppervlakte - a.oppervlakte)

  // Bereken totalen per categorie
  const totalen = {}
  for (const g of gebouwen) {
    totalen[g.categorie] = (totalen[g.categorie] || 0) + g.oppervlakte
  }

  return {
    gevonden: gebouwen.length > 0,
    aantalGebouwen: gebouwen.length,
    gebouwen,
    totalen,  // { woonhuis: 180, stal: 850, schuur: 320, ... }
  }
}

/**
 * Haal BAG panden op als GeoJSON features voor kaartweergave.
 * Grotere straal (~500m) zodat het hele erf zichtbaar is.
 * Retourneert ruwe features met geometry — voor selectie op de kaart.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Array>}  GeoJSON features array
 */
export async function getBagPandenVoorKaart(lat, lng) {
  const buffer = 0.005  // ~500m straal

  const bboxStr = `${lng - buffer},${lat - buffer},${lng + buffer},${lat + buffer},EPSG:4326`

  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'bag:pand',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: bboxStr,
    count: '200',
  })

  try {
    const res = await fetch(`${PDOK_BAG_WFS}?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()

    // Verrijk elke feature met berekende m² en id
    return (data.features || [])
      .filter(f => f.properties?.status !== 'Pand gesloopt')
      .map(f => ({
        ...f,
        properties: {
          ...f.properties,
          id: f.properties?.identificatie || f.id,
          berekendM2: Math.round(calcHectaresVanGeometry(f.geometry) * 10000),
        }
      }))
  } catch (e) {
    console.warn('[BAG] Panden voor kaart ophalen mislukt:', e.message)
    return []
  }
}

/**
 * Haal gebruiksdoelen en officiële oppervlakte op voor een specifiek pand-ID.
 * Wordt aangeroepen na selectie van een pand op de kaart.
 */
export async function getBagVerblijfsobjectVoorPand(pandId) {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'bag:verblijfsobject',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    CQL_FILTER: `pandidentificatie='${pandId}'`,
    count: '10',
  })

  try {
    const res = await fetch(`${PDOK_BAG_WFS}?${params}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const features = data.features || []
    if (features.length === 0) return null

    const vbos = features.map(f => {
      let gebruiksdoelen = f.properties?.gebruiksdoel || []
      if (typeof gebruiksdoelen === 'string') gebruiksdoelen = [gebruiksdoelen]
      return { oppervlakte: f.properties?.oppervlakte || 0, gebruiksdoelen }
    })

    const totaalOppervlakte = vbos.reduce((s, v) => s + v.oppervlakte, 0)
    const gebruiksdoelen = [...new Set(vbos.flatMap(v => v.gebruiksdoelen))]
    return { oppervlakte: totaalOppervlakte, gebruiksdoelen }
  } catch (e) {
    return null
  }
}

/** Haal BAG panden op via WFS */
async function fetchBagPanden(bboxStr) {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'bag:pand',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: bboxStr,
    count: '100',
  })

  try {
    const res = await fetch(`${PDOK_BAG_WFS}?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map(f => ({
      id: f.properties?.identificatie || f.id,
      bouwjaar: f.properties?.bouwjaar || null,
      status: f.properties?.status || '',
      berekendM2: calcHectaresVanGeometry(f.geometry) * 10000,  // ha → m²
    }))
  } catch (e) {
    console.warn('[BAG] Panden ophalen mislukt:', e.message)
    return []
  }
}

/** Haal BAG verblijfsobjecten op via WFS */
async function fetchBagVerblijfsobjecten(bboxStr) {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'bag:verblijfsobject',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    bbox: bboxStr,
    count: '100',
  })

  try {
    const res = await fetch(`${PDOK_BAG_WFS}?${params}`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.features || []).map(f => {
      const props = f.properties || {}
      // gebruiksdoel kan een string zijn of een array in BAG WFS
      let gebruiksdoelen = props.gebruiksdoel || []
      if (typeof gebruiksdoelen === 'string') gebruiksdoelen = [gebruiksdoelen]

      return {
        pandId: props.pandidentificatie || '',
        oppervlakte: props.oppervlakte || 0,
        gebruiksdoelen,
        status: props.status || '',
      }
    })
  } catch (e) {
    console.warn('[BAG] Verblijfsobjecten ophalen mislukt:', e.message)
    return []
  }
}

/**
 * Vertaal BAG gebruiksdoelen naar onze interne gebouw-categorieën.
 * Agrarische stallen/schuren staan vaak niet in VBO → valt terug op 'schuur'.
 */
function bepaalCategorie(gebruiksdoelen, oppervlakte) {
  const doelen = gebruiksdoelen.map(d => d.toLowerCase())
  if (doelen.includes('woonfunctie')) {
    // Grote woning (>250m²) → vermoedelijk bedrijfswoning
    return oppervlakte > 250 ? 'bedrijfswoning' : 'woonhuis'
  }
  if (doelen.includes('industriefunctie') || doelen.includes('celfunctie')) {
    return oppervlakte > 500 ? 'stal' : 'schuur'
  }
  if (doelen.includes('bijeenkomstfunctie') || doelen.includes('sportfunctie')) return 'overig'
  if (doelen.includes('logiesfunctie')) return 'overig'
  // Geen gebruiksdoel bekend (typisch voor agrarische bebouwing zonder VBO)
  return oppervlakte > 600 ? 'stal' : 'schuur'
}

// --- Hulpfuncties ---

function flattenCoords(geometry) {
  if (!geometry) return []
  const type = geometry.type
  if (type === 'Point') return [geometry.coordinates]
  if (type === 'LineString') return geometry.coordinates
  if (type === 'Polygon') return geometry.coordinates.flat()
  if (type === 'MultiPolygon') return geometry.coordinates.flat(2)
  return []
}

/**
 * Bereken oppervlakte in hectares via de shoelace-formule
 * Coördinaten zijn WGS84 (lng/lat), omzetten naar meters via cosinus-benadering
 */
function calcHectaresVanGeometry(geometry) {
  try {
    let coords = []
    if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0]
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0]
    }
    if (!coords || coords.length < 3) return 0

    // Shoelace in graden, correctie voor breedtegraad
    const latMid = coords.reduce((s, c) => s + c[1], 0) / coords.length
    const mPerDegLng = 111320 * Math.cos(latMid * Math.PI / 180)
    const mPerDegLat = 110574

    let area = 0
    for (let i = 0; i < coords.length - 1; i++) {
      const x1 = coords[i][0] * mPerDegLng
      const y1 = coords[i][1] * mPerDegLat
      const x2 = coords[i + 1][0] * mPerDegLng
      const y2 = coords[i + 1][1] * mPerDegLat
      area += (x1 * y2 - x2 * y1)
    }
    const m2 = Math.abs(area) / 2
    return +(m2 / 10000).toFixed(2)
  } catch {
    return 0
  }
}
