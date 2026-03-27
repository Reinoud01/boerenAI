/**
 * kennisbankService.js — Boer Transitie Scanner
 * ===============================================
 * Lokale kennisbank-zoekfunctie. Geen Supabase, geen embeddings, geen server.
 *
 * Werkt op basis van kennisbank.json, gegenereerd door:
 *   npm run kennisbank
 *
 * API is bewust gelijk gehouden aan de oude ragService zodat de rest
 * van de app niet hoeft te worden aangepast.
 *
 * Exporteert:
 *   zoekBeleid(provincie, thema, maxResultaten)   → Array<Chunk>
 *   zoekAlleBeleid(provincie, themas)             → { [thema]: Array<Chunk> }
 *   zoekVrij(zoekterm, opties)                    → Array<Chunk>
 */

// kennisbank.json wordt gebundeld door Vite als statische import
// Zorg dat je eerst 'npm run kennisbank' hebt gedraaid
let kennisbank = null

async function laadKennisbank() {
  if (kennisbank) return kennisbank
  try {
    // Vite bundelt JSON imports automatisch — geen 'assert' nodig
    const module = await import('../data/kennisbank.json')
    kennisbank = module.default
    console.log(`[Kennisbank] Geladen: ${kennisbank.chunks.length} chunks, gegenereerd op ${kennisbank.meta.gegenereerd}`)
  } catch (err) {
    console.warn('[Kennisbank] kennisbank.json niet gevonden. Draai eerst: npm run kennisbank')
    kennisbank = { chunks: [], meta: { aantalChunks: 0 } }
  }
  return kennisbank
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoekwoorden per thema
// ─────────────────────────────────────────────────────────────────────────────

const THEMA_ZOEKWOORDEN = {
  vab: [
    'vab', 'vrijkomende agrarische bebouwing', 'herbestemming', 'functieverandering',
    'rood voor rood', 'rood-voor-rood', 'ruimte voor ruimte', 'sloopbonus',
    'functiewijziging', 'agrarische bedrijfsgebouwen', 'erftransformatie',
  ],
  landgoed: [
    'landgoed', 'nsw', 'natuurschoonwet', 'nieuwe landgoederen', 'landgoedvorming',
    'buitenplaats', 'fiscale vrijstelling', 'landbouwvrijstelling', 'groene diensten',
  ],
  rood_voor_rood: [
    'rood voor rood', 'rood-voor-rood', 'ruimte voor ruimte', 'sloopbonus',
    'agrarische sloop', 'woning bouwen sloop', 'compensatiewoning',
  ],
  nnn: [
    'nnn', 'natuur netwerk', 'natuur netwerk nederland', 'gnn', 'ecologische hoofdstructuur',
    'ehs', 'beschermde natuur', 'weidevogelgebied', 'natte natuur',
  ],
  beeindiging: [
    'beëindiging', 'beeindiging', 'stoppersregeling', 'uitkoop', 'lbv',
    'saneringsregeling', 'msa', 'piekbelaster', 'staken', 'bedrijfsbeëindiging',
    'agrarisch bedrijf stopt', 'sanering veehouderij',
  ],
  pacht: [
    'pacht', 'verpachten', 'reguliere pacht', 'geliberaliseerde pacht',
    'pachtrecht', 'pachter', 'pachtprijs', 'agrarische pacht',
  ],
  fiscaal: [
    'fiscaal', 'stakingswinst', 'landbouwvrijstelling', 'for', 'fiscale reserve',
    'box 1', 'wevab', 'overdrachtsbelasting', 'btw agrarisch',
    'bedrijfsopvolging', 'bor', 'belasting', 'inkomstenbelasting',
  ],
  natuur: [
    'natuur', 'nnn', 'natura 2000', 'stikstof', 'stikstofdepositie',
    'nieuwe natuur', 'boscompensatie', 'groene diensten',
  ],
  erftransformatie: [
    'erftransformatie', 'planologisch', 'concept', 'erf', 'transformatie',
    'functiemenging', 'nevenactiviteit', 'zorgboerderij',
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoeklogica
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score een chunk op relevantie voor een set zoekwoorden.
 * Geeft een getal terug (hoe hoger, hoe relevanter).
 */
function scoreChunk(chunk, zoekwoorden, provincie) {
  let score = 0
  const tekst = (chunk.titel + ' ' + chunk.tekst).toLowerCase()

  for (const woord of zoekwoorden) {
    if (tekst.includes(woord.toLowerCase())) {
      // Exacte match in titel weegt zwaarder
      const inTitel = chunk.titel.toLowerCase().includes(woord.toLowerCase())
      score += inTitel ? 3 : 1
    }
  }

  // Bonus voor provinciale match
  if (provincie && chunk.provincie) {
    const provNorm = provincie.toLowerCase().replace(/[^a-z]/g, '')
    const chunkProv = chunk.provincie.toLowerCase().replace(/[^a-z]/g, '')
    if (chunkProv.includes(provNorm) || provNorm.includes(chunkProv)) {
      score += 5
    }
  }

  // Bonus voor nationale scope (altijd relevant als aanvulling)
  if (chunk.scope === 'nationaal') score += 1
  if (chunk.scope === 'handreiking') score += 1

  return score
}

// Cache per sessie
const cache = new Map()

/**
 * Zoek relevante kennisbankchunks voor een thema + provincie.
 * Compatibel met de oude ragService API.
 *
 * @param {string} provincie       - bijv. 'Gelderland'
 * @param {string} thema           - 'vab' | 'landgoed' | 'rood_voor_rood' | 'nnn' | 'beeindiging' | 'pacht' | 'fiscaal'
 * @param {number} maxResultaten
 * @returns {Promise<Array>}
 */
export async function zoekBeleid(provincie, thema, maxResultaten = 3) {
  const kb = await laadKennisbank()
  if (!kb.chunks.length) return []

  const cacheKey = `${provincie}:${thema}:${maxResultaten}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  const zoekwoorden = THEMA_ZOEKWOORDEN[thema] || [thema]

  // Score alle chunks
  const gescoord = kb.chunks
    .map(chunk => ({ chunk, score: scoreChunk(chunk, zoekwoorden, provincie) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResultaten)
    .map(({ chunk, score }) => ({
      sectie:     chunk.titel,
      tekst:      chunk.tekst,
      thema:      thema,
      provincie:  chunk.provincie,
      scope:      chunk.scope,
      bron:       chunk.bron,
      similarity: Math.min(Math.round((score / 12) * 100), 99),  // pseudo-score 0-99
    }))

  cache.set(cacheKey, gescoord)
  return gescoord
}

/**
 * Zoek voor alle thema's tegelijk — compatibel met oude ragService API.
 *
 * @param {string}   provincie
 * @param {string[]} themas
 * @returns {Promise<Object>}  - { landgoed: [...], vab: [...], ... }
 */
export async function zoekAlleBeleid(provincie, themas = []) {
  if (!provincie || themas.length === 0) return {}

  const resultaten = await Promise.allSettled(
    themas.map(thema => zoekBeleid(provincie, thema, 3))
  )

  const gebundeld = {}
  themas.forEach((thema, i) => {
    const r = resultaten[i]
    gebundeld[thema] = r.status === 'fulfilled' ? r.value : []
  })

  return gebundeld
}

/**
 * Vrije zoekopdracht op de volledige kennisbank.
 * Handig voor de scenario-resultatenpagina of een toekomstige zoekbalk.
 *
 * @param {string} zoekterm
 * @param {Object} opties    - { provincie, scope, categorie, max }
 * @returns {Promise<Array>}
 */
export async function zoekVrij(zoekterm, opties = {}) {
  const kb = await laadKennisbank()
  if (!kb.chunks.length) return []

  const { provincie, scope, categorie, max = 5 } = opties
  const woorden = zoekterm.toLowerCase().split(/\s+/).filter(w => w.length > 2)

  return kb.chunks
    .filter(chunk => {
      if (scope     && chunk.scope     !== scope)     return false
      if (categorie && chunk.categorie !== categorie) return false
      if (provincie && chunk.provincie && !chunk.provincie.toLowerCase().includes(provincie.toLowerCase())) return false
      return true
    })
    .map(chunk => {
      const tekst = (chunk.titel + ' ' + chunk.tekst).toLowerCase()
      const score = woorden.reduce((acc, w) => acc + (tekst.includes(w) ? 1 : 0), 0)
      return { ...chunk, _score: score }
    })
    .filter(c => c._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, max)
}

/**
 * Haal alle chunks op voor een specifieke provincie.
 * Handig voor het tonen van "wat geldt er in uw provincie".
 */
export async function haalProvincieInfo(provincie) {
  const kb = await laadKennisbank()
  return kb.chunks.filter(chunk =>
    chunk.provincie?.toLowerCase() === provincie.toLowerCase()
  )
}

/**
 * Noop — was in ragService om het ML-model voor te laden.
 * Niet meer nodig, maar behouden voor backwards-compatibiliteit.
 */
export function verwarmModel() {
  // Alvast laden voor snellere eerste zoekopdracht
  laadKennisbank()
}
