#!/usr/bin/env node
/**
 * genereer_kennisbank.js — Boer Transitie Scanner
 * ================================================
 * Leest alle .md bestanden uit de kennisbank map (recursief),
 * knipt ze op in chunks per heading-sectie,
 * en schrijft src/data/kennisbank.json.
 *
 * Gebruik:
 *   npm run kennisbank
 *
 * Voeg nieuwe documenten toe aan /kennisbank/ en draai dit script opnieuw.
 * Het JSON-bestand wordt automatisch bijgewerkt — nooit handmatig aanpassen.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Pad naar kennisbank (één map boven het project)
const KENNISBANK_PAD  = path.resolve(__dirname, '../../kennisbank')
const OUTPUT_PAD      = path.resolve(__dirname, '../src/data/kennisbank.json')
const MAX_CHUNK_CHARS = 3000  // max tekens per chunk (voorkomt enorme stukken)

// ─────────────────────────────────────────────────────────────────────────────
// Hulpfuncties
// ─────────────────────────────────────────────────────────────────────────────

/** Detecteer scope op basis van mapnaam */
function detecteerScope(relPad) {
  const p = relPad.toLowerCase().replace(/\\/g, '/')
  if (p.includes('omgevingsverordening'))        return 'provinciaal'
  if (p.includes('handreiking'))                 return 'handreiking'
  if (p.includes('fiscaal') || p.includes('fiscale')) return 'fiscaal'
  if (p.includes('nationaal'))                   return 'nationaal'
  return 'overig'
}

/** Detecteer provincie op basis van bestandsnaam */
function detecteerProvincie(bestandsnaam) {
  const provincies = [
    'gelderland', 'overijssel', 'noord_brabant', 'brabant',
    'utrecht', 'drenthe', 'friesland', 'groningen',
    'limburg', 'flevoland', 'zeeland', 'noord_holland', 'zuid_holland',
  ]
  const naam = bestandsnaam.toLowerCase()
  for (const p of provincies) {
    if (naam.includes(p)) {
      // Normaliseer naar leesbare naam
      const mapping = {
        noord_brabant: 'Noord-Brabant', brabant: 'Noord-Brabant',
        noord_holland: 'Noord-Holland', zuid_holland: 'Zuid-Holland',
        gelderland: 'Gelderland', overijssel: 'Overijssel',
        utrecht: 'Utrecht', drenthe: 'Drenthe',
        friesland: 'Friesland', groningen: 'Groningen',
        limburg: 'Limburg', flevoland: 'Flevoland', zeeland: 'Zeeland',
      }
      return mapping[p] || p.charAt(0).toUpperCase() + p.slice(1)
    }
  }
  return null
}

/** Detecteer categorie op basis van bestandsnaam */
function detecteerCategorie(bestandsnaam) {
  const naam = bestandsnaam.toLowerCase()
  if (naam.includes('vab') || naam.includes('rood'))           return 'vab'
  if (naam.includes('beslisboom'))                             return 'fiscaal_beslisboom'
  if (naam.includes('landbouwvrijstelling'))                   return 'fiscaal_landbouwvrijstelling'
  if (naam.includes('stakingswinst'))                          return 'fiscaal_stakingswinst'
  if (naam.includes('bor') || naam.includes('bedrijfsopvolging')) return 'fiscaal_bor'
  if (naam.includes('overdrachtsbelasting'))                   return 'fiscaal_ovb'
  if (naam.includes('btw'))                                    return 'fiscaal_btw'
  if (naam.includes('mia') || naam.includes('vamil') || naam.includes('eia')) return 'fiscaal_mia'
  if (naam.includes('fiscaal'))                                return 'fiscaal'
  if (naam.includes('nsw') || naam.includes('natuurschoon') || naam.includes('landgoed')) return 'landgoed'
  if (naam.includes('beeindig') || naam.includes('lbv'))       return 'beeindiging'
  if (naam.includes('pacht'))                                  return 'pacht'
  if (naam.includes('natuur') || naam.includes('nnn'))         return 'natuur'
  if (naam.includes('erftransformatie') || naam.includes('planologisch')) return 'erftransformatie'
  if (naam.includes('transitie') || naam.includes('overgang')) return 'transitie'
  if (naam.includes('wonen') || naam.includes('klein'))        return 'wonen'
  if (naam.includes('omgevingsverordening'))                   return 'omgevingsverordening'
  return 'overig'
}

/** Verzamel alle .md bestanden recursief */
function verzamelMdBestanden(map, resultaat = []) {
  if (!fs.existsSync(map)) return resultaat
  for (const item of fs.readdirSync(map)) {
    if (item.startsWith('.')) continue  // skip .DS_Store etc.
    const volledigPad = path.join(map, item)
    const stat = fs.statSync(volledigPad)
    if (stat.isDirectory()) {
      verzamelMdBestanden(volledigPad, resultaat)
    } else if (item.endsWith('.md') && item !== 'INDEX.md') {
      resultaat.push(volledigPad)
    }
  }
  return resultaat
}

/**
 * Knip een markdown-bestand op in chunks per sectie (## en ### niveau).
 * Elke chunk bevat de heading als titel en de tekst onder die heading.
 * Lange chunks worden gesplitst op MAX_CHUNK_CHARS.
 */
function knipInChunks(inhoud, metaBase) {
  const chunks = []
  const regels = inhoud.split('\n')

  let huidigeTitel  = metaBase.bestandsnaam.replace('.md', '')
  let huidigeTekst  = []
  let chunkIndex    = 0

  function slaChunkOp() {
    const tekst = huidigeTekst.join('\n').trim()
    if (tekst.length < 30) return  // skip lege of triviaal kleine stukken

    // Splits te lange chunks op
    if (tekst.length <= MAX_CHUNK_CHARS) {
      chunks.push({
        id:         `${metaBase.id_prefix}_${chunkIndex++}`,
        scope:      metaBase.scope,
        provincie:  metaBase.provincie,
        categorie:  metaBase.categorie,
        titel:      huidigeTitel,
        tekst:      tekst,
        bron:       metaBase.relPad,
      })
    } else {
      // Knip grote chunks op in stukken van MAX_CHUNK_CHARS
      let positie = 0
      while (positie < tekst.length) {
        const stuk = tekst.slice(positie, positie + MAX_CHUNK_CHARS)
        chunks.push({
          id:        `${metaBase.id_prefix}_${chunkIndex++}`,
          scope:     metaBase.scope,
          provincie: metaBase.provincie,
          categorie: metaBase.categorie,
          titel:     huidigeTitel,
          tekst:     stuk,
          bron:      metaBase.relPad,
        })
        positie += MAX_CHUNK_CHARS
      }
    }
  }

  for (const regel of regels) {
    // Detecteer headings op niveau ## of ###
    const h2 = regel.match(/^##\s+(.+)/)
    const h3 = regel.match(/^###\s+(.+)/)

    if (h2 || h3) {
      slaChunkOp()  // sla vorige sectie op
      huidigeTitel = (h2 || h3)[1].trim()
      huidigeTekst = []
    } else {
      huidigeTekst.push(regel)
    }
  }
  slaChunkOp()  // sla laatste sectie op

  return chunks
}

// ─────────────────────────────────────────────────────────────────────────────
// Hoofdprogramma
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  console.log('📚 Boer Transitie Scanner — Kennisbank generator')
  console.log(`📂 Kennisbank pad: ${KENNISBANK_PAD}`)
  console.log(`📄 Output: ${OUTPUT_PAD}`)
  console.log('')

  if (!fs.existsSync(KENNISBANK_PAD)) {
    console.error(`❌ Kennisbank map niet gevonden: ${KENNISBANK_PAD}`)
    process.exit(1)
  }

  const bestanden = verzamelMdBestanden(KENNISBANK_PAD)
  console.log(`📋 ${bestanden.length} bestanden gevonden\n`)

  const alleChunks = []
  const bronnen    = []

  for (const volledigPad of bestanden) {
    const relPad      = path.relative(KENNISBANK_PAD, volledigPad)
    const bestandsnaam = path.basename(volledigPad)
    const scope       = detecteerScope(relPad)
    const provincie   = detecteerProvincie(bestandsnaam)
    const categorie   = detecteerCategorie(bestandsnaam)
    const id_prefix   = relPad
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_md$/, '')
      .toLowerCase()

    const inhoud = fs.readFileSync(volledigPad, 'utf-8')
    const chunks = knipInChunks(inhoud, {
      bestandsnaam, relPad, scope, provincie, categorie, id_prefix,
    })

    alleChunks.push(...chunks)
    bronnen.push(relPad)

    console.log(`  ✅ ${relPad.padEnd(55)} → ${chunks.length} chunks`)
  }

  // Bouw het uiteindelijke JSON-object
  const output = {
    meta: {
      gegenereerd:   new Date().toISOString().split('T')[0],
      aantalChunks:  alleChunks.length,
      aantalBronnen: bronnen.length,
      bronnen,
    },
    chunks: alleChunks,
  }

  // Schrijf naar src/data/kennisbank.json
  const outputDir = path.dirname(OUTPUT_PAD)
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })

  fs.writeFileSync(OUTPUT_PAD, JSON.stringify(output, null, 2), 'utf-8')

  const kb = Math.round(fs.statSync(OUTPUT_PAD).size / 1024)
  console.log('')
  console.log(`✨ Klaar! ${alleChunks.length} chunks uit ${bronnen.length} bestanden`)
  console.log(`📦 Bestandsgrootte: ${kb} KB`)
  console.log('')
  console.log('Voeg nieuwe bestanden toe aan /kennisbank/ en draai opnieuw:')
  console.log('  npm run kennisbank')
}

main()
