import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useScanStore from '../store/useScanStore'
import Layout from '../components/Layout'
import { zoekAlleBeleid } from '../services/kennisbankService'
import { ALLE_SCENARIOS } from '../services/scenarioEngine'

// ─────────────────────────────────────────────────────────────────────────────
// Stijl-helpers
// ─────────────────────────────────────────────────────────────────────────────

const HAALBAARHEID_STIJL = {
  hoog:     { label: 'Hoog',     bg: 'bg-brand-green', text: 'text-black' },
  gemiddeld:{ label: 'Gemiddeld',bg: 'bg-black',        text: 'text-white' },
  laag:     { label: 'Laag',     bg: 'bg-brand-gray-light', text: 'text-black' },
}

const RISICO_STIJL = {
  'Laag':      'text-brand-green font-semibold',
  'Beperkt':   'text-brand-green font-semibold',
  'Gemiddeld': 'text-amber-600 font-semibold',
  'Hoog':      'text-red-600 font-semibold',
}

const KENNIS_STIJL = {
  'Laag':     'text-brand-green font-semibold',
  'Gemiddeld':'text-amber-600 font-semibold',
  'Hoog':     'text-red-600 font-semibold',
}

// Thema's per scenario-id voor kennisbank-verdieping
const SCENARIO_THEMAS = {
  lbv:             ['beeindiging', 'fiscaal'],
  nsw:             ['landgoed', 'fiscaal'],
  rood_voor_rood:  ['vab', 'rood_voor_rood'],
  vab_wonen:       ['vab', 'erftransformatie'],
  vakantiewoningen:['vab'],
  recreatie:       ['vab'],
  zorgboerderij:   ['vab', 'erftransformatie'],
  bedrijfsruimte:  ['vab'],
  natuur:          ['natuur', 'nnn'],
  zonnepanelen:    ['fiscaal'],
  agrifood:        ['vab'],
  verkoop:             ['fiscaal', 'pacht'],
  verpachten:          ['pacht', 'fiscaal'],
  hobbydieren:         ['beeindiging'],
  akkerbouw_doorstart: ['beeindiging', 'fiscaal'],
}

const THEMA_LABEL = {
  beeindiging:    'Beëindigen & regelingen',
  fiscaal:        'Fiscale aspecten',
  landgoed:       'Landgoed & NSW',
  vab:            'VAB-beleid',
  rood_voor_rood: 'Rood-voor-rood regeling',
  erftransformatie:'Erftransformatie',
  pacht:          'Pacht & verpachten',
  natuur:         'Natuur & NNN',
  nnn:            'Natuur Netwerk Nederland',
}

// Categorieën voor de zijbalk
const CATEGORIE_VOLGORDE = ['Bebouwing', 'Functie', 'Grond', 'Energie', 'Stoppers']

// ─────────────────────────────────────────────────────────────────────────────
// GeoSignalen — kleine badges per scenario (uit verrijkMetGeoData)
// ─────────────────────────────────────────────────────────────────────────────

const GEO_STIJL = {
  warning:  'bg-amber-100 text-amber-800 border border-amber-300',
  info:     'bg-blue-50 text-blue-800 border border-blue-200',
  positief: 'bg-brand-green/30 text-black border border-brand-green',
}

function GeoSignalen({ signalen = [], compact = false }) {
  if (!signalen || signalen.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : 'px-5 py-3'}`}>
      {signalen.map((s, i) => (
        <span key={i} className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${GEO_STIJL[s.type] || GEO_STIJL.info}`}>
          {s.type === 'warning' ? '⚠️ ' : s.type === 'positief' ? '✓ ' : 'ℹ '}
          {s.tekst}
        </span>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricTile — klein kennental-blokje
// ─────────────────────────────────────────────────────────────────────────────

function MetricTile({ label, waarde, highlight = false, compact = false }) {
  return (
    <div className={`border border-brand-gray-light p-3 flex flex-col gap-1 ${highlight ? 'bg-brand-green' : 'bg-white'}`}>
      <p className="text-[10px] uppercase tracking-widest text-brand-gray-dark leading-none">{label}</p>
      <p className={`font-semibold leading-tight ${compact ? 'text-xs' : 'text-sm'} ${highlight ? 'text-black' : ''}`}>
        {waarde}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FiscaalBlok — uitklapbaar
// ─────────────────────────────────────────────────────────────────────────────

function FiscaalBlok({ modules, disclaimer }) {
  const [open, setOpen] = useState(false)
  if (!modules?.length) return null

  return (
    <div className="border-t border-brand-gray-light">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-gray-50 transition-colors text-left"
      >
        <span>💶 Fiscale aandachtspunten ({modules.length})</span>
        <span className="text-brand-gray-mid">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {modules.map(mod => (
            <div key={mod.id} className={`border-l-4 pl-4 py-2 ${mod.waarschuwing ? 'border-amber-400 bg-amber-50' : 'border-black bg-gray-50'}`}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1">{mod.titel}</p>
              <p className="text-xs text-brand-gray-dark leading-relaxed mb-2">{mod.kernboodschap}</p>
              <p className="text-xs text-brand-gray-dark italic">→ {mod.actie}</p>
            </div>
          ))}
          <p className="text-[11px] text-brand-gray-mid leading-relaxed border-t border-brand-gray-light pt-3">
            <strong className="uppercase">Let op:</strong> {disclaimer}
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DuurzaamheidsBlok — uitklapbaar
// ─────────────────────────────────────────────────────────────────────────────

function DuurzaamheidsBlok({ duurzaamheid }) {
  const [open, setOpen] = useState(false)
  if (!duurzaamheid) return null

  return (
    <div className="border-t border-brand-gray-light">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-gray-50 transition-colors text-left"
      >
        <span>🌱 Duurzaamheid & subsidies</span>
        <span className="text-brand-gray-mid">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="bg-gray-50 p-4 space-y-3">
            <p className="text-xs text-brand-gray-dark leading-relaxed">{duurzaamheid.beschrijving}</p>

            <div className="border-l-4 border-brand-green pl-3">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray-dark mb-1">Subsidies & regelingen</p>
              <p className="text-xs text-brand-gray-dark leading-relaxed">{duurzaamheid.subsidies}</p>
            </div>

            <div className="border-l-4 border-amber-400 pl-3">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray-dark mb-1">Onderhoudslast</p>
              <p className="text-xs text-brand-gray-dark leading-relaxed">{duurzaamheid.onderhoudslast}</p>
            </div>
          </div>
          <p className="text-[11px] text-brand-gray-mid">
            Een duurzaamheidsslag kan gecombineerd worden met een transitie — vraag uw adviseur naar de combinatiemogelijkheden.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KennisbankVerdieping — uitklapbaar beleid & regelgeving
// ─────────────────────────────────────────────────────────────────────────────

function KennisbankPassage({ passage, provinciaal = false }) {
  const [uitgevouwen, setUitgevouwen] = useState(false)
  const korteTekst = passage.tekst.length > 300 ? passage.tekst.slice(0, 300) + '…' : passage.tekst
  return (
    <div className={`text-xs leading-relaxed ${provinciaal ? 'border-l-2 border-brand-gray-light pl-3' : ''}`}>
      {passage.sectie && <p className="font-semibold text-brand-gray-dark mb-1">{passage.sectie}</p>}
      <p className={`text-brand-gray-dark ${provinciaal ? 'italic' : ''}`}>
        {uitgevouwen ? passage.tekst : korteTekst}
      </p>
      {passage.tekst.length > 300 && (
        <button onClick={() => setUitgevouwen(!uitgevouwen)} className="text-xs underline text-brand-gray-mid mt-1 hover:text-black">
          {uitgevouwen ? 'Minder tonen ↑' : 'Meer tonen ↓'}
        </button>
      )}
    </div>
  )
}

function KennisbankBlok({ thema, passages, provincie }) {
  const [open, setOpen] = useState(['beeindiging','vab','landgoed'].includes(thema))
  const nationaal   = passages.filter(p => p.scope === 'nationaal' || p.scope === 'handreiking')
  const provinciaal = passages.filter(p => p.scope === 'provinciaal')
  if (passages.length === 0) return null

  return (
    <div className="border border-brand-gray-light">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors">
        <span className="text-xs uppercase tracking-widest font-semibold">{THEMA_LABEL[thema] || thema}</span>
        <span className="text-brand-gray-mid text-xs">{open ? '↑ Inklappen' : '↓ Uitklappen'}</span>
      </button>
      {open && (
        <div className="border-t border-brand-gray-light divide-y divide-brand-gray-light">
          {nationaal.slice(0, 2).map((p, i) => (
            <div key={i} className="p-4 bg-white"><KennisbankPassage passage={p} /></div>
          ))}
          {provinciaal.length > 0 && provincie && (
            <div className="p-4 bg-gray-50">
              <p className="text-xs text-brand-gray-mid uppercase tracking-widest mb-3">📋 Uit de omgevingsverordening {provincie}</p>
              <div className="space-y-3">
                {provinciaal.slice(0, 2).map((p, i) => (
                  <KennisbankPassage key={i} passage={p} provinciaal={true} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function KennisbankVerdieping({ scenarioId, kennisbankData, provincie, laden }) {
  const [open, setOpen] = useState(false)
  const themas = SCENARIO_THEMAS[scenarioId] || []
  const heeftData = themas.some(t => kennisbankData[t]?.length > 0)

  if (laden) {
    return (
      <div className="border-t border-brand-gray-light px-5 py-4 bg-gray-50">
        <p className="text-xs text-brand-gray-mid italic">Provinciale beleidscontext laden…</p>
      </div>
    )
  }
  if (!heeftData) return null

  return (
    <div className="border-t border-brand-gray-light">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3 text-xs uppercase tracking-widest font-semibold hover:bg-gray-50 transition-colors text-left">
        <span>📋 Beleid & regelgeving verdieping</span>
        <span className="text-brand-gray-mid">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2">
          {provincie && (
            <p className="text-xs text-brand-gray-mid mb-3">Inclusief provinciaal beleid {provincie}</p>
          )}
          {themas.map(thema => (
            <KennisbankBlok key={thema} thema={thema} passages={kennisbankData[thema] || []} provincie={provincie} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GroenVoorRoodCallout — tip bij woningbouw/recreatie scenario's
// ─────────────────────────────────────────────────────────────────────────────

function GroenVoorRoodCallout() {
  return (
    <div className="mx-5 mb-4 p-4 border-l-4 border-brand-green bg-brand-green/10">
      <p className="text-[10px] uppercase tracking-widest font-semibold mb-1 text-black">Tip: geef ook iets terug</p>
      <p className="text-xs text-brand-gray-dark leading-relaxed">
        Wie wil bouwen of een nieuwe functie geven aan zijn erf, merkt steeds vaker dat een groene tegenprestatie het proces versnelt.
        Denk aan een landschapselement, waterberging, een haag of een stuk natuur op een deel van het perceel.
        Overheden staan hier steeds meer voor open — en het versterkt uw positie bij de vergunningaanvraag.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VernieuwendeOpties — aparte sectie met vernieuwende routes uit de handreikingen
// ─────────────────────────────────────────────────────────────────────────────

const VERNIEUWENDE_OPTIES = [
  {
    icoon: '🏠',
    titel: 'Tiny houses',
    ondertitel: 'Tijdelijk (BOPA) of permanent',
    tekst: 'Kleine woonunits op een agrarisch erf kunnen via de BOPA-regeling (Buitenplanse Omgevingsplanactiviteit) tijdelijk worden geplaatst — tot 15 jaar. Daarna is permanente woonbestemming via het omgevingsplan een optie. Tiny houses hebben een hoge huurwaarde per m² en een lage bouwdrempel. Ze passen goed op een erf dat deels leeg komt te staan.',
    kansen: ['Sneller te realiseren dan een reguliere verbouwing', 'BOPA-procedure minder zwaar dan omgevingsplanwijziging', 'Flexibel — units zijn verplaatsbaar bij tijdelijke toestemming'],
    aandacht: 'Nutsaansluitingen, fundering en brandveiligheidseisen gelden ook voor tiny houses. Vraag de gemeente naar de lokale BOPA-criteria.',
  },
  {
    icoon: '🔀',
    titel: 'Dubbele bestemmingen',
    ondertitel: 'Combineer functies op één perceel',
    tekst: 'Overheden staan steeds meer open voor percelen met een dubbele bestemming: meerdere functies op hetzelfde stuk grond. Voorbeelden: natuur + recreatiehuisjes (NSW gecombineerd met glamping), water + zonnepanelen (drijvende solar op vijvers of sloten), of natuur + zorgboerderij. Dit combineert inkomstenbronnen én vergroot de maatschappelijke meerwaarde — wat draagvlak bij gemeenten vergroot.',
    kansen: ['Meerdere subsidiebronnen combineerbaar', 'Sterkere vergunningspositie door maatschappelijke meerwaarde', 'Toenemende beleidsruimte in nieuwe omgevingsplannen'],
    aandacht: 'Complexere vergunningsprocedure — een ruimtelijk adviseur of omgevingsjurist is hier sterk aan te raden.',
  },
]

function VernieuwendeOpties() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-8 border border-brand-gray-light">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold">Vernieuwende opties</p>
          <p className="text-xs text-brand-gray-dark mt-0.5">Minder bekende routes die steeds vaker kansen bieden</p>
        </div>
        <span className="text-brand-gray-mid text-sm shrink-0 ml-4">{open ? '↑ Inklappen' : '↓ Bekijken'}</span>
      </button>

      {open && (
        <div className="border-t border-brand-gray-light divide-y divide-brand-gray-light">
          {VERNIEUWENDE_OPTIES.map((opt, i) => (
            <div key={i} className="p-5">
              <div className="flex items-start gap-4">
                <span className="text-3xl shrink-0">{opt.icoon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-wide mb-0.5">{opt.titel}</p>
                  <p className="text-xs text-brand-gray-dark uppercase tracking-widest mb-3">{opt.ondertitel}</p>
                  <p className="text-sm text-brand-gray-dark leading-relaxed mb-4">{opt.tekst}</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-semibold mb-2 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 bg-brand-green"></span> Kansen
                      </p>
                      <ul className="space-y-1">
                        {opt.kansen.map((k, j) => (
                          <li key={j} className="text-xs text-brand-gray-dark flex gap-2">
                            <span className="text-brand-green shrink-0">✓</span><span>{k}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-3">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-amber-800 mb-1">Let op</p>
                      <p className="text-xs text-amber-800 leading-relaxed">{opt.aandacht}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="px-5 py-4 bg-gray-50">
            <p className="text-xs text-brand-gray-mid leading-relaxed">
              Deze opties komen uit de LNV-handreikingen Erftransformatie en zijn nog niet in elk omgevingsplan uitgewerkt.
              Een gesprek met een specialist kan snel duidelijkheid geven over wat in uw gemeente mogelijk is.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 1 — Overzichtskaart (compact, met metric tiles)
// ─────────────────────────────────────────────────────────────────────────────

function KaartOverzicht({ scenario, nr, onMeerInfo }) {
  const h = HAALBAARHEID_STIJL[scenario.haalbaarheid] || HAALBAARHEID_STIJL.gemiddeld
  const kg = scenario.kengetallen || {}

  return (
    <div className="border border-brand-gray-light hover:border-black transition-colors cursor-pointer group" onClick={() => onMeerInfo(scenario)}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-brand-gray-light">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{scenario.icoon}</span>
          <div>
            <p className="text-[10px] text-brand-gray-dark uppercase tracking-wide mb-0.5">Scenario {nr}</p>
            <h3 className="text-sm font-semibold uppercase tracking-wide">{scenario.naam}</h3>
          </div>
        </div>
        <span className={`px-3 py-1 text-xs uppercase tracking-widest font-semibold ${h.bg} ${h.text}`}>
          {h.label}
        </span>
      </div>

      {/* Korte samenvatting */}
      <div className="px-5 py-3 border-b border-brand-gray-light">
        <p className="text-xs text-brand-gray-dark leading-relaxed line-clamp-2">{scenario.samenvatting}</p>
      </div>

      {/* 6 Metric tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-6 border-b border-brand-gray-light divide-x divide-brand-gray-light">
        <MetricTile label="Haalbaarheid" waarde={h.label} highlight={scenario.haalbaarheid === 'hoog'} compact />
        <MetricTile label="Investering"  waarde={kg.investering  || '—'} compact />
        <MetricTile label={kg.inkomstenType || 'Inkomsten'} waarde={kg.inkomsten || '—'} compact />
        <MetricTile label="Doorlooptijd" waarde={kg.doorlooptijd || '—'} compact />
        <MetricTile label="Risico"       waarde={kg.risico       || '—'} compact />
        <MetricTile label="Kennis nodig" waarde={kg.kennis       || '—'} compact />
      </div>

      {/* GeoSignalen — badges */}
      {scenario.geoSignalen?.length > 0 && (
        <div className="px-5 py-2 border-b border-brand-gray-light">
          <GeoSignalen signalen={scenario.geoSignalen} compact />
        </div>
      )}

      {/* Groen-voor-rood tip */}
      {scenario.groenvooRoodTip && <GroenVoorRoodCallout />}

      {/* CTA */}
      <div className="px-5 py-3 flex items-center justify-between">
        <p className="text-[10px] text-brand-gray-mid uppercase tracking-widest">
          {scenario.relevanteRegelingen?.slice(0, 1).join('')}
        </p>
        <button
          onClick={e => { e.stopPropagation(); onMeerInfo(scenario) }}
          className="text-xs uppercase tracking-widest font-semibold border border-black px-4 py-2 hover:bg-black hover:text-white transition-colors group-hover:bg-black group-hover:text-white"
        >
          Meer info →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// NIVEAU 2 — Detail-view van één scenario
// ─────────────────────────────────────────────────────────────────────────────

function ScenarioDetail({ scenario, kennisbankData, provincie, laden, onTerug, onNogMeerInfo }) {
  const h  = HAALBAARHEID_STIJL[scenario.haalbaarheid] || HAALBAARHEID_STIJL.gemiddeld
  const kg = scenario.kengetallen || {}

  return (
    <div className="border border-brand-gray-light">
      {/* Back + header */}
      <div className="border-b border-brand-gray-light">
        <button onClick={onTerug} className="w-full flex items-center gap-2 px-5 py-3 text-xs text-brand-gray-dark hover:text-black transition-colors text-left border-b border-brand-gray-light">
          ← Terug naar overzicht
        </button>
        <div className="flex items-start justify-between px-5 py-5">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{scenario.icoon}</span>
            <div>
              <p className="text-xs text-brand-gray-dark uppercase tracking-wide mb-1">Scenario — gedetailleerde analyse</p>
              <h2 className="text-xl font-semibold uppercase tracking-wide">{scenario.naam}</h2>
            </div>
          </div>
          <span className={`px-4 py-2 text-sm uppercase tracking-widest font-semibold ${h.bg} ${h.text}`}>
            {h.label}
          </span>
        </div>
      </div>

      {/* 6 Metric tiles — groter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 border-b border-brand-gray-light divide-x divide-y sm:divide-y-0 divide-brand-gray-light">
        <MetricTile label="Haalbaarheid" waarde={h.label}                          highlight={scenario.haalbaarheid === 'hoog'} />
        <MetricTile label="Investering"  waarde={kg.investering  || '—'} />
        <MetricTile label={kg.inkomstenType || 'Inkomsten'} waarde={kg.inkomsten || '—'} />
        <MetricTile label="Doorlooptijd" waarde={kg.doorlooptijd || '—'} />
        <MetricTile label="Risico"       waarde={<span className={RISICO_STIJL[kg.risico] || ''}>{kg.risico || '—'}</span>} />
        <MetricTile label="Kennis nodig" waarde={<span className={KENNIS_STIJL[kg.kennis] || ''}>{kg.kennis || '—'}</span>} />
      </div>

      {/* GeoSignalen — badges in detail */}
      {scenario.geoSignalen?.length > 0 && (
        <div className="border-b border-brand-gray-light">
          <GeoSignalen signalen={scenario.geoSignalen} />
        </div>
      )}

      {/* Samenvatting */}
      <div className="px-5 py-5 border-b border-brand-gray-light">
        <p className="text-xs uppercase tracking-widest font-semibold text-brand-gray-dark mb-3">Over dit scenario</p>
        <p className="text-sm text-brand-gray-dark leading-relaxed">{scenario.samenvatting}</p>
      </div>

      {/* Kansen + Pijnpunten */}
      <div className="grid md:grid-cols-2 border-b border-brand-gray-light divide-y md:divide-y-0 md:divide-x divide-brand-gray-light">
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-brand-green"></span> Kansen
          </p>
          <ul className="space-y-2">
            {(scenario.kansen || []).map((k, i) => (
              <li key={i} className="flex gap-3 text-xs text-brand-gray-dark leading-relaxed">
                <span className="text-brand-green mt-0.5 shrink-0">✓</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-red-200"></span> Aandachtspunten
          </p>
          <ul className="space-y-2">
            {(scenario.pijnpunten || []).map((p, i) => (
              <li key={i} className={`flex gap-3 text-xs leading-relaxed ${p.startsWith('⚠️') ? 'text-amber-700 font-medium' : 'text-brand-gray-dark'}`}>
                <span className="text-red-400 mt-0.5 shrink-0">!</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Relevante regelingen + Eerste stap */}
      <div className="grid md:grid-cols-2 border-b border-brand-gray-light divide-y md:divide-y-0 md:divide-x divide-brand-gray-light">
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3">Relevante regelingen</p>
          <ul className="space-y-1.5">
            {(scenario.relevanteRegelingen || []).map((r, i) => (
              <li key={i} className={`text-xs leading-relaxed flex gap-2 ${r.startsWith('✓') ? 'text-brand-green font-medium' : 'text-brand-gray-dark'}`}>
                <span className="shrink-0 text-brand-gray-mid">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3">Aanbevolen vervolgstap</p>
          <p className="text-xs text-brand-gray-dark leading-relaxed">{scenario.vervolgstap}</p>
          {scenario.aandachtspunten?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-gray-light">
              <p className="text-[10px] uppercase tracking-widest text-brand-gray-mid mb-2">Extra aandachtspunten</p>
              <ul className="space-y-1">
                {scenario.aandachtspunten.map((a, i) => (
                  <li key={i} className="text-xs text-brand-gray-dark flex gap-2">
                    <span className="shrink-0">→</span><span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Duurzaamheidsblok */}
      <DuurzaamheidsBlok duurzaamheid={scenario.duurzaamheid} />

      {/* Groen-voor-rood tip */}
      {scenario.groenvooRoodTip && (
        <div className="border-t border-brand-gray-light">
          <GroenVoorRoodCallout />
        </div>
      )}

      {/* Kennisbank verdieping */}
      <KennisbankVerdieping
        scenarioId={scenario.id}
        kennisbankData={kennisbankData}
        provincie={provincie}
        laden={laden}
      />

      {/* Fiscale modules */}
      <FiscaalBlok modules={scenario.fiscaal?.modules} disclaimer={scenario.fiscaal?.disclaimer} />

      {/* CTA naar gesprek */}
      <div className="px-5 py-6 bg-brand-gray-light flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-1">Wilt u weten of dit scenario bij u past?</p>
          <p className="text-xs text-brand-gray-dark">Ontvang een volledig uitgewerkt stappenplan voor dit scenario.</p>
        </div>
        <button
          onClick={onNogMeerInfo}
          className="bg-black text-white text-xs uppercase tracking-widest font-semibold px-6 py-3 hover:bg-brand-green hover:text-black transition-colors whitespace-nowrap shrink-0"
        >
          Neem contact op →
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Zijbalk — alle 20 scenario's, matched gemarkeerd
// ─────────────────────────────────────────────────────────────────────────────

function AlleScenariosSidebar({ matchedIds, onSelectScenario, actief }) {
  const categorieGroepen = CATEGORIE_VOLGORDE.map(cat => ({
    naam: cat,
    items: ALLE_SCENARIOS.filter(s => s.categorie === cat),
  }))

  return (
    <div className="border border-brand-gray-light">
      <div className="px-4 py-3 border-b border-brand-gray-light bg-black text-white">
        <p className="text-[10px] uppercase tracking-widest font-semibold">Alle scenario's</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Uw matches zijn groen gemarkeerd</p>
      </div>

      {categorieGroepen.map(({ naam, items }) => (
        <div key={naam} className="border-b border-brand-gray-light last:border-b-0">
          <p className="px-4 py-2 text-[10px] uppercase tracking-widest text-brand-gray-mid bg-gray-50">{naam}</p>
          {items.map(s => {
            const isMatch   = matchedIds.includes(s.id)
            const isActief  = actief === s.id
            return (
              <button
                key={s.id}
                onClick={() => isMatch && onSelectScenario(s.id)}
                className={`w-full flex items-center gap-2 px-4 py-2 text-left border-b border-brand-gray-light last:border-b-0 transition-colors
                  ${isActief  ? 'bg-brand-green border-brand-green' : ''}
                  ${isMatch && !isActief ? 'hover:bg-brand-green/20 cursor-pointer' : ''}
                  ${!isMatch  ? 'opacity-40 cursor-default' : ''}`}
              >
                <span className="text-base leading-none">{s.icoon}</span>
                <span className={`text-xs leading-tight ${isMatch ? 'font-medium' : 'text-brand-gray-dark'}`}>
                  {s.naam}
                </span>
                {isMatch && !isActief && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-brand-green shrink-0"></span>
                )}
              </button>
            )
          })}
        </div>
      ))}

      <div className="p-4 bg-gray-50 border-t border-brand-gray-light">
        <p className="text-[10px] text-brand-gray-mid leading-relaxed">
          Scenario niet gevonden? In een gesprek bespreken we ook andere opties voor uw specifieke situatie.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hoofdpagina — Stap 3 Resultaat
// ─────────────────────────────────────────────────────────────────────────────

export default function Stap3Resultaat() {
  const navigate    = useNavigate()
  const { scenarios, antwoorden, totaalHectares, handmatigeInvoer, geoChecks, locatie, setHuidigeStap } = useScanStore()

  // Weergave-state
  const [weergave,       setWeergave]       = useState('overzicht')   // 'overzicht' | 'detail'
  const [actielScenario, setActielScenario] = useState(null)

  // Kennisbank
  const [kennisbankData, setKennisbankData] = useState({})
  const [laden,          setLaden]          = useState(false)

  const provincie   = locatie?.provincie || antwoorden.provincie || ''
  const ha          = handmatigeInvoer?.hectares || antwoorden.hectaresEigendom || totaalHectares
  const matchedIds  = scenarios.map(s => s.id)

  useEffect(() => {
    setHuidigeStap(3)
    if (scenarios.length === 0) { navigate('/kaart'); return }

    // Laad kennisbank-passages voor alle matched scenario's
    const alleThemas = [...new Set(scenarios.flatMap(s => SCENARIO_THEMAS[s.id] || []))]
    if (alleThemas.length > 0) {
      setLaden(true)
      zoekAlleBeleid(provincie, alleThemas)
        .then(setKennisbankData)
        .finally(() => setLaden(false))
    }
  }, [])

  // Sidebar-klik: selecteer scenario uit de volledige catalogus
  function handleSidebarSelect(id) {
    const s = scenarios.find(sc => sc.id === id)
    if (s) { setActielScenario(s); setWeergave('detail'); window.scrollTo(0, 0) }
  }

  // Kaart-klik: open detail
  function handleMeerInfo(scenario) {
    setActielScenario(scenario)
    setWeergave('detail')
    window.scrollTo(0, 0)
  }

  function handleTerug() {
    setWeergave('overzicht')
    setActielScenario(null)
    window.scrollTo(0, 0)
  }

  return (
    <Layout huidigeStap={3}>
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Intro-header ── */}
        <div className="mb-8 pb-6 border-b border-brand-gray-light">
          <p className="text-xs uppercase tracking-widest text-brand-gray-dark mb-2">Uw quickscan resultaat</p>
          <h1 className="text-3xl font-semibold uppercase mb-4">
            {scenarios.length} scenario{scenarios.length !== 1 ? "'s" : ''} voor uw situatie
          </h1>
          <div className="flex flex-wrap gap-3 text-xs text-brand-gray-dark">
            {antwoorden.bedrijfstype && (
              <span className="bg-brand-gray-light px-3 py-1 uppercase tracking-wide">{antwoorden.bedrijfstype}</span>
            )}
            {ha && (
              <span className="bg-brand-gray-light px-3 py-1 uppercase tracking-wide">{parseFloat(ha).toFixed(1)} ha</span>
            )}
            {provincie && (
              <span className="bg-brand-gray-light px-3 py-1 uppercase tracking-wide">{provincie}</span>
            )}
            {geoChecks.natura2000?.aanwezig && (
              <span className="bg-brand-green px-3 py-1 uppercase tracking-wide text-black">⚠️ Nabij Natura 2000</span>
            )}
            {laden && (
              <span className="text-brand-gray-mid px-3 py-1 text-xs italic">Kennisbank laden…</span>
            )}
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div className="mb-6 p-4 border border-brand-gray-light">
          <p className="text-xs text-brand-gray-dark leading-relaxed">
            <strong className="uppercase">Disclaimer:</strong> Deze scan is een gratis oriëntatie en geen juridisch of fiscaal advies.
            De scenario's zijn indicatief en gebaseerd op de door u ingevoerde gegevens.
            Raadpleeg altijd een gekwalificeerde adviseur voordat u besluiten neemt.
          </p>
        </div>

        {/* ── Twee-koloms layout: hoofd + zijbalk ── */}
        <div className="flex gap-6 items-start">

          {/* Hoofdkolom */}
          <div className="flex-1 min-w-0">

            {/* NIVEAU 1 — Overzicht */}
            {weergave === 'overzicht' && (
              <div className="space-y-4">

                {/* Introtekst */}
                <div className="border-l-4 border-black pl-5 py-2 mb-6">
                  <h2 className="text-lg font-semibold mb-3">Herkenbaar? Of juist verrassend?</h2>
                  <div className="space-y-3 text-sm text-brand-gray-dark leading-relaxed max-w-xl">
                    <p>Stoppen met boeren is zelden alleen een zakelijke beslissing. Het gaat over een erf dat misschien al generaties in de familie is. Over wat er overblijft. Over wat eerlijk voelt, voor jezelf, voor je kinderen, voor de plek.</p>
                    <p>De mogelijkheden hieronder zijn een startpunt. Geen van deze scenario's zet je zomaar in gang. Daar heb je mensen voor nodig die jouw situatie écht kennen: de grond, de familie, de gemeente, het geld.</p>
                    <p>Wij helpen stoppende boeren om dat plaatje compleet te maken. Niet met een standaardadvies, maar door met je mee te kijken.</p>
                    <p className="font-medium text-black">Wil je dat we even meekijken? Dat kan, gewoon een gesprek, zonder verplichtingen.</p>
                  </div>
                </div>

                <p className="text-xs text-brand-gray-mid">
                  Klik op een scenario voor een uitgebreide analyse, of bekijk alle opties in de zijbalk.
                </p>
                {scenarios.map((scenario, i) => (
                  <KaartOverzicht
                    key={scenario.id}
                    scenario={scenario}
                    nr={i + 1}
                    onMeerInfo={handleMeerInfo}
                  />
                ))}

                {/* Vernieuwende opties */}
                <VernieuwendeOpties />

                {/* CTA onderaan overzicht */}
                <div className="mt-8 border-t border-brand-gray-light pt-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h2 className="text-lg font-semibold uppercase mb-3">Volgende stap</h2>
                      <p className="text-sm text-brand-gray-dark leading-relaxed mb-5">
                        Wilt u weten welk scenario het beste bij uw situatie past?
                        Plan een vrijblijvend gesprek. In 30 minuten krijgt u concreet inzicht in uw opties.
                      </p>
                      <button
                        onClick={() => navigate('/gesprek')}
                        className="bg-black text-white font-semibold text-xs uppercase tracking-widest px-8 py-4 hover:bg-brand-green hover:text-black transition-colors"
                      >
                        Plan een gesprek →
                      </button>
                    </div>
                    <div className="bg-brand-green p-5">
                      <h3 className="text-sm font-semibold uppercase tracking-wide mb-2">Volledig rapport</h3>
                      <p className="text-sm leading-relaxed mb-4">
                        Ontvang een gedetailleerd rapport met alle scenario's, fiscale analyse en een stappenplan op maat.
                      </p>
                      <button
                        onClick={() => navigate('/gesprek')}
                        className="text-xs uppercase tracking-widest font-semibold underline hover:no-underline"
                      >
                        Rapport aanvragen →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NIVEAU 2 — Detail */}
            {weergave === 'detail' && actielScenario && (
              <ScenarioDetail
                scenario={actielScenario}
                kennisbankData={kennisbankData}
                provincie={provincie}
                laden={laden}
                onTerug={handleTerug}
                onNogMeerInfo={() => navigate('/gesprek')}
              />
            )}
          </div>

          {/* Zijbalk — alle scenario's */}
          <div className="w-64 shrink-0 hidden lg:block sticky top-6">
            <AlleScenariosSidebar
              matchedIds={matchedIds}
              onSelectScenario={handleSidebarSelect}
              actief={actielScenario?.id}
            />
          </div>
        </div>

      </div>
    </Layout>
  )
}
