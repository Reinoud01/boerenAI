/**
 * RAG Service — Boer Transitie Scanner
 *
 * Zoekt relevante passages uit provinciale omgevingsverordeningen.
 * Embeddings worden BROWSER-SIDE gegenereerd via @xenova/transformers (WebAssembly).
 * Geen Edge Function of server nodig — volledig gratis en client-side.
 *
 * Flow:
 *   1. Model laden vanuit CDN (eerste keer ~25 MB, daarna gecached)
 *   2. Zoekzin embedden direct in de browser
 *   3. Similarity search via Supabase RPC (zoek_kennisbank)
 *   4. Relevante passages teruggeven aan scenarioEngine / resultatenpagina
 */

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

const TIMEOUT_MS = 12000  // model laden kost eerste keer wat meer tijd

// Module-level pipeline cache (model wordt maar één keer geladen per sessie)
let _pipeline = null
let _pipelineLaden = false
let _pipelineWachtrij = []

/**
 * Laad het multilingual-e5-small model (eenmalig, daarna gecached).
 * Werkt via WebAssembly in de browser — geen API key nodig.
 */
async function getEmbeddingModel() {
  if (_pipeline) return _pipeline

  // Als al aan het laden: wacht op dezelfde promise
  if (_pipelineLaden) {
    return new Promise((resolve, reject) => {
      _pipelineWachtrij.push({ resolve, reject })
    })
  }

  _pipelineLaden = true

  try {
    // Dynamisch laden van CDN zodat het niet in de bundle komt
    const { pipeline, env } = await import(
      'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'
    )

    // Gebruik alleen CDN — geen lokale cache in single-file HTML
    env.allowLocalModels = false

    _pipeline = await pipeline(
      'feature-extraction',
      'Xenova/multilingual-e5-small',
      { quantized: true }  // ~25 MB i.p.v. ~100 MB
    )

    // Wachtrij afhandelen
    _pipelineWachtrij.forEach(p => p.resolve(_pipeline))
    _pipelineWachtrij = []

    return _pipeline

  } catch (err) {
    _pipelineLaden = false
    _pipelineWachtrij.forEach(p => p.reject(err))
    _pipelineWachtrij = []
    throw err
  }
}

/**
 * Genereer een embedding vector voor een zoekopdracht.
 * multilingual-e5 verwacht 'query: ' prefix voor zoekopdrachten.
 */
async function maakEmbedding(tekst) {
  const model = await getEmbeddingModel()
  const output = await model(`query: ${tekst}`, {
    pooling: 'mean',
    normalize: true,
  })
  return Array.from(output.data)
}

// Cache om dubbele requests te voorkomen (provincie+thema als key)
const cache = new Map()

/**
 * Zoekzinnen per thema — specifiek geformuleerd voor goede embedding-matches
 */
const ZOEKZINNEN = {
  landgoed:       (p) => `nieuwe landgoederen vorming NSW Natuurschoonwet regels voorwaarden ${p}`,
  vab:            (p) => `vrijkomende agrarische bebouwing herbestemming wonen recreatie functieverandering ${p}`,
  rood_voor_rood: (p) => `rood voor rood ruimte voor ruimte sloopbonus agrarische bebouwing woning bouwen ${p}`,
  nnn:            (p) => `natuur netwerk nederland NNN bescherming functiewijziging toegestaan ${p}`,
  beeindiging:    (p) => `beëindiging agrarisch bedrijf stoppersregeling uitkoop sanering ${p}`,
  pacht:          (p) => `pacht verpachten agrarische grond regulier geliberaliseerd ${p}`,
}

/**
 * Zoek relevante beleidstekst voor een specifiek thema + provincie.
 *
 * @param {string} provincie   - bijv. 'Gelderland'
 * @param {string} thema       - 'landgoed' | 'vab' | 'rood_voor_rood' | 'nnn' | 'beeindiging' | 'pacht'
 * @param {number} maxResultaten
 * @returns {Promise<Array<{sectie, tekst, similarity}>>}
 */
export async function zoekBeleid(provincie, thema, maxResultaten = 3) {
  if (!SUPABASE_URL || !SUPABASE_ANON || SUPABASE_ANON === 'JOUW_ANON_KEY_HIER') {
    return []
  }

  const cacheKey = `${provincie}:${thema}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  try {
    // Zoekzin formuleren
    const zoekzinFn = ZOEKZINNEN[thema] || ((p) => `agrarisch beleid ${thema} ${p}`)
    const zoekzin   = zoekzinFn(provincie)

    // Embedding genereren in de browser
    const embedding = await maakEmbedding(zoekzin)

    // Similarity search in Supabase
    const response = await fetchMetTimeout(
      `${SUPABASE_URL}/rest/v1/rpc/zoek_kennisbank`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({
          query_embedding:  embedding,
          filter_provincie: provincie || null,
          filter_thema:     thema     || null,
          max_resultaten:   maxResultaten,
          min_similarity:   0.3,
        }),
      },
      TIMEOUT_MS
    )

    if (!response.ok) {
      console.warn('[RAG] Supabase fout:', response.status, await response.text())
      return []
    }

    const resultaten = await response.json()
    const opgeschoond = (resultaten || []).map(r => ({
      sectie:     r.sectie,
      tekst:      r.tekst,
      thema:      r.thema,
      similarity: Math.round(r.similarity * 100),
    }))

    // Cache 5 minuten
    cache.set(cacheKey, opgeschoond)
    setTimeout(() => cache.delete(cacheKey), 5 * 60 * 1000)

    return opgeschoond

  } catch (err) {
    // Nooit de app laten crashen vanwege RAG
    console.warn('[RAG] Fout (app werkt gewoon door):', err.message)
    return []
  }
}

/**
 * Haal RAG-resultaten op voor alle relevante thema's tegelijk.
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
 * Warm het model alvast op op de achtergrond (optioneel).
 * Aanroepen zodra de boer de vragenlijst invult, zodat het klaar is op de resultatenpagina.
 */
export function verwarmModel() {
  getEmbeddingModel().catch(() => {
    // Stille fallback als model niet laadbaar is
  })
}

// Hulpfunctie: fetch met timeout
async function fetchMetTimeout(url, opties, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...opties, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
