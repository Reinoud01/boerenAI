import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useScanStore from '../store/useScanStore'
import { genereerScenarios } from '../services/scenarioEngine'
import { verwarmModel } from '../services/kennisbankService'
import Layout from '../components/Layout'

function RadioGroep({ naam, opties, waarde, onChange, label, sublabel }) {
  return (
    <div className="mb-6">
      <label className="block text-xs uppercase tracking-widest font-semibold mb-1">{label}</label>
      {sublabel && <p className="text-xs text-brand-gray-dark mb-3">{sublabel}</p>}
      <div className="flex flex-wrap gap-2">
        {opties.map(opt => (
          <button
            key={opt.waarde}
            onClick={() => onChange(naam, opt.waarde)}
            className={`px-4 py-2 text-xs uppercase tracking-wide border transition-colors ${
              waarde === opt.waarde
                ? 'bg-black text-white border-black'
                : 'bg-white text-black border-brand-gray-light hover:border-black'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CheckboxGroep({ opties, gekozen, onToggle, label, sublabel }) {
  return (
    <div className="mb-6">
      <label className="block text-xs uppercase tracking-widest font-semibold mb-1">{label}</label>
      {sublabel && <p className="text-xs text-brand-gray-dark mb-3">{sublabel}</p>}
      <div className="flex flex-wrap gap-2">
        {opties.map(opt => (
          <button
            key={opt.waarde}
            onClick={() => onToggle(opt.waarde)}
            className={`px-4 py-2 text-xs uppercase tracking-wide border transition-colors ${
              gekozen.includes(opt.waarde)
                ? 'bg-brand-green text-black border-black'
                : 'bg-white text-black border-brand-gray-light hover:border-black'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Stap2Vragen() {
  const navigate = useNavigate()
  const {
    antwoorden, setAntwoord, toggleWens, toggleFunctieWens,
    geoChecks, dsoData, totaalHectares, handmatigeInvoer,
    grond, bebouwing, locatie, setScenarios, setHuidigeStap
  } = useScanStore()

  const [huidigBlok, setHuidigBlok] = useState(0)
  const [fouten, setFouten] = useState([])

  useEffect(() => {
    setHuidigeStap(2)
    verwarmModel()
  }, [])

  const toonFunctieWensen = antwoorden.wensen.includes('functiewijziging')

  const blokken = [
    // ── BLOK 1: Uw bedrijf ──────────────────────────────────────────────────
    {
      titel: 'Uw bedrijf',
      subtitel: 'Vertel ons over uw huidige situatie',
      verplicht: ['bedrijfstype'],
      vragen: (
        <>
          <RadioGroep
            naam="bedrijfstype" label="Wat is uw huidige bedrijfstype?"
            waarde={antwoorden.bedrijfstype} onChange={setAntwoord}
            opties={[
              { waarde: 'veehouderij',  label: 'Veehouderij' },
              { waarde: 'akkerbouw',    label: 'Akkerbouw' },
              { waarde: 'tuinbouw',     label: 'Tuinbouw' },
              { waarde: 'gemengd',      label: 'Gemengd' },
              { waarde: 'anders',       label: 'Anders' },
            ]}
          />
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-2">Hectares eigendom</label>
              <input
                type="number" min="0" step="0.5"
                value={antwoorden.hectaresEigendom || grond?.hectaresEigendom || ''}
                onChange={e => setAntwoord('hectaresEigendom', e.target.value)}
                placeholder={grond?.hectaresEigendom || handmatigeInvoer?.hectares || totaalHectares || '0'}
                className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-2">Hectares pacht</label>
              <input
                type="number" min="0" step="0.5"
                value={antwoorden.hectaresPacht || grond?.hectaresPacht || ''}
                onChange={e => setAntwoord('hectaresPacht', e.target.value)}
                placeholder={grond?.hectaresPacht || '0'}
                className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none"
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest font-semibold mb-2">Provincie</label>
            <select
              value={antwoorden.provincie || locatie?.provincie || ''}
              onChange={e => setAntwoord('provincie', e.target.value)}
              className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none bg-white"
            >
              <option value="">Selecteer uw provincie</option>
              {['Drenthe','Flevoland','Friesland','Gelderland','Groningen',
                'Limburg','Noord-Brabant','Noord-Holland','Overijssel',
                'Utrecht','Zeeland','Zuid-Holland'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <RadioGroep
            naam="heeftOpvolger" label="Heeft u een bedrijfsopvolger?"
            waarde={antwoorden.heeftOpvolger} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',      label: 'Ja' },
              { waarde: 'nee',     label: 'Nee' },
              { waarde: 'onzeker', label: 'Onzeker' },
            ]}
          />
        </>
      ),
    },

    // ── BLOK 2: Uw positie ───────────────────────────────────────────────────
    {
      titel: 'Uw positie',
      subtitel: 'Uw huidige positie t.o.v. regelingen en omgeving',
      verplicht: [],
      vragen: (
        <>
          <RadioGroep
            naam="contactOverheid" label="Heeft u al contact gehad met de overheid over uitkoop of beëindiging?"
            waarde={antwoorden.contactOverheid} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',         label: 'Ja' },
              { waarde: 'nee',        label: 'Nee' },
              { waarde: 'orientatie', label: 'Oriënterend gesprek' },
            ]}
          />
          {geoChecks.natura2000 === null && (
            <RadioGroep
              naam="nabijNatura2000" label="Ligt uw bedrijf in of nabij een Natura 2000-gebied?"
              waarde={antwoorden.nabijNatura2000} onChange={setAntwoord}
              opties={[
                { waarde: 'ja',       label: 'Ja' },
                { waarde: 'nee',      label: 'Nee' },
                { waarde: 'weet_niet', label: 'Weet ik niet' },
              ]}
            />
          )}
          {geoChecks.natura2000 !== null && (
            <div className={`mb-6 p-4 border ${geoChecks.natura2000.aanwezig ? 'border-black bg-brand-green' : 'border-brand-gray-light'}`}>
              <p className="text-xs uppercase tracking-widest font-semibold mb-1">
                {geoChecks.natura2000.aanwezig ? '⚠️ Natura 2000 gedetecteerd' : '✓ Geen Natura 2000 in directe omgeving'}
              </p>
              {geoChecks.natura2000.aanwezig && geoChecks.natura2000.gebieden?.length > 0 && (
                <p className="text-xs text-brand-gray-dark">{geoChecks.natura2000.gebieden.join(', ')}</p>
              )}
              <p className="text-xs text-brand-gray-dark mt-1">Automatisch bepaald op basis van uw locatie.</p>
            </div>
          )}
          <RadioGroep
            naam="taxatieGedaan" label="Heeft u al een taxatie laten uitvoeren?"
            waarde={antwoorden.taxatieGedaan} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',  label: 'Ja' },
              { waarde: 'nee', label: 'Nee' },
            ]}
          />
        </>
      ),
    },

    // ── BLOK 3: Uw wensen ────────────────────────────────────────────────────
    {
      titel: 'Uw wensen',
      subtitel: 'Wat wilt u bereiken met uw grond en bedrijf?',
      verplicht: ['tijdshorizon'],
      vragen: (
        <>
          <CheckboxGroep
            label="Wat wilt u het liefste met uw grond?"
            sublabel="Meerdere keuzes mogelijk"
            opties={[
              { waarde: 'verkopen',         label: 'Volledig verkopen' },
              { waarde: 'deels_verkopen',   label: 'Deels verkopen' },
              { waarde: 'functiewijziging', label: 'Functie wijzigen' },
              { waarde: 'landgoed',         label: 'Landgoed vormen' },
              { waarde: 'verpachten',       label: 'Verpachten' },
              { waarde: 'energie',          label: 'Energie opwekken' },
              { waarde: 'weet_niet',        label: 'Weet nog niet' },
            ]}
            gekozen={antwoorden.wensen}
            onToggle={toggleWens}
          />

          {toonFunctieWensen && (
            <CheckboxGroep
              label="Welke nieuwe functies spreken u aan?"
              sublabel="Helpt ons de juiste scenario's te vinden"
              opties={[
                { waarde: 'wonen',         label: '🏠 Woningen (VAB)' },
                { waarde: 'recreatie',     label: '⛺ Recreatie / camping' },
                { waarde: 'vakantie',      label: '🏕️ Vakantiewoningen / B&B' },
                { waarde: 'zorg',          label: '🌿 Zorgboerderij' },
                { waarde: 'kinderopvang',  label: '🧒 Kinderopvang / BSO' },
                { waarde: 'bedrijfsruimte',label: '🏭 Bedrijfsruimte verhuur' },
                { waarde: 'agrifood',      label: '🛒 Streekproducten / boerderijwinkel' },
                { waarde: 'natuur',        label: '🌳 Natuur / voedselbos' },
              ]}
              gekozen={antwoorden.functieWensen}
              onToggle={toggleFunctieWens}
            />
          )}

          <RadioGroep
            naam="tijdshorizon" label="Wat is uw tijdshorizon?"
            waarde={antwoorden.tijdshorizon} onChange={setAntwoord}
            opties={[
              { waarde: '1jaar',   label: 'Binnen 1 jaar' },
              { waarde: '1-3jaar', label: '1–3 jaar' },
              { waarde: '3-5jaar', label: '3–5 jaar' },
              { waarde: 'langer',  label: 'Langer dan 5 jaar' },
            ]}
          />
          <RadioGroep
            naam="financieelDoel" label="Wat is uw belangrijkste financiële doel?"
            waarde={antwoorden.financieelDoel} onChange={setAntwoord}
            opties={[
              { waarde: 'maximale_opbrengst',  label: 'Maximale opbrengst' },
              { waarde: 'fiscaal_optimaal',    label: 'Fiscaal optimaal' },
              { waarde: 'volgende_generatie',  label: 'Iets achterlaten' },
              { waarde: 'rust_zekerheid',      label: 'Rust en zekerheid' },
            ]}
          />
        </>
      ),
    },

    // ── BLOK 4: Uw erf & plannen ─────────────────────────────────────────────
    {
      titel: 'Uw erf & gebouwen',
      subtitel: 'Praktische informatie voor een realistische inschatting',
      verplicht: [],
      vragen: (
        <>
          <RadioGroep
            naam="bouwkundigeStaat"
            label="Wat is de bouwkundige staat van uw agrarische gebouwen?"
            sublabel="Dit bepaalt de investeringsraming"
            waarde={antwoorden.bouwkundigeStaat} onChange={setAntwoord}
            opties={[
              { waarde: 'goed',   label: 'Goed — solide constructie' },
              { waarde: 'matig',  label: 'Matig — renovatie nodig' },
              { waarde: 'slecht', label: 'Slecht — ingrijpende aanpak' },
              { waarde: 'wisselend', label: 'Wisselend per gebouw' },
            ]}
          />
          <RadioGroep
            naam="asbestAanwezig" label="Is er asbest aanwezig in uw gebouwen of op het dak?"
            sublabel="Asbest heeft grote impact op kosten en doorlooptijd"
            waarde={antwoorden.asbestAanwezig} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',       label: 'Ja' },
              { waarde: 'nee',      label: 'Nee' },
              { waarde: 'weet_niet', label: 'Weet ik niet' },
            ]}
          />
          <RadioGroep
            naam="rolNaTransitie"
            label="Wilt u na de transitie actief betrokken blijven bij het erf?"
            sublabel="Helpt ons de beste match te maken"
            waarde={antwoorden.rolNaTransitie} onChange={setAntwoord}
            opties={[
              { waarde: 'actief',          label: 'Ja, actieve rol' },
              { waarde: 'passief',         label: 'Nee, liever passief inkomen' },
              { waarde: 'maakt_niet_uit',  label: 'Maakt me niet uit' },
            ]}
          />
          <RadioGroep
            naam="ervaringVastgoed" label="Heeft u ervaring met vastgoedbeheer of verhuur?"
            waarde={antwoorden.ervaringVastgoed} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',  label: 'Ja' },
              { waarde: 'nee', label: 'Nee' },
            ]}
          />
          {['veehouderij', 'gemengd'].includes(antwoorden.bedrijfstype) && (
            <RadioGroep
              naam="wiltHobbydieren"
              label="Wilt u na het stoppen nog dieren houden?"
              sublabel="Hobbymatig dieren houden is in veel gevallen toegestaan na deelname aan een beëindigingsregeling"
              waarde={antwoorden.wiltHobbydieren} onChange={setAntwoord}
              opties={[
                { waarde: 'ja',             label: 'Ja, graag' },
                { waarde: 'nee',            label: 'Nee' },
                { waarde: 'maakt_niet_uit', label: 'Maakt me niet uit' },
              ]}
            />
          )}
        </>
      ),
    },

    // ── BLOK 5: Financiën & beperkingen ──────────────────────────────────────
    {
      titel: 'Financiën & beperkingen',
      subtitel: 'Laatste stap — praktische randvoorwaarden',
      verplicht: [],
      vragen: (
        <>
          <RadioGroep
            naam="eigenVermogen"
            label="Hoeveel eigen vermogen kunt u inbrengen voor een investering?"
            sublabel="Indicatief — voor de financieringsberekening"
            waarde={antwoorden.eigenVermogen} onChange={setAntwoord}
            opties={[
              { waarde: '<50k',     label: 'Minder dan €50k' },
              { waarde: '50-150k',  label: '€50k – €150k' },
              { waarde: '150-500k', label: '€150k – €500k' },
              { waarde: '>500k',    label: 'Meer dan €500k' },
            ]}
          />
          <RadioGroep
            naam="rechtsVorm" label="Wat is de rechtsvorm van uw bedrijf?"
            sublabel="Bepaalt het fiscale regime bij staking"
            waarde={antwoorden.rechtsVorm} onChange={setAntwoord}
            opties={[
              { waarde: 'eenmanszaak', label: 'Eenmanszaak' },
              { waarde: 'maatschap',   label: 'Maatschap / VOF' },
              { waarde: 'bv',          label: 'BV' },
              { waarde: 'anders',      label: 'Anders' },
            ]}
          />
          <RadioGroep
            naam="heeftHypotheek" label="Zijn er hypotheken of leningen op het bedrijf?"
            waarde={antwoorden.heeftHypotheek} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',  label: 'Ja' },
              { waarde: 'nee', label: 'Nee' },
            ]}
          />
          <RadioGroep
            naam="heeftPachtcontract" label="Zijn er lopende pachtcontracten op uw grond?"
            waarde={antwoorden.heeftPachtcontract} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',  label: 'Ja' },
              { waarde: 'nee', label: 'Nee' },
            ]}
          />
          <RadioGroep
            naam="heeftFOR" label="Heeft u gebruik gemaakt van de Fiscale Oudedagsreserve (FOR)?"
            waarde={antwoorden.heeftFOR} onChange={setAntwoord}
            opties={[
              { waarde: 'ja',       label: 'Ja' },
              { waarde: 'nee',      label: 'Nee' },
              { waarde: 'weet_niet', label: 'Weet ik niet' },
            ]}
          />
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-widest font-semibold mb-2">
              Bijzonderheden of specifieke wensen? (optioneel)
            </label>
            <textarea
              value={antwoorden.specifiekeWensen}
              onChange={e => setAntwoord('specifiekeWensen', e.target.value)}
              rows={3}
              placeholder="Bijv. familiebedrijf, samenwerking met buurman, specifieke gebouwen..."
              className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none resize-none"
            />
          </div>
        </>
      ),
    },
  ]

  const gaVerder = () => {
    const blok = blokken[huidigBlok]
    const missend = blok.verplicht.filter(v => !antwoorden[v])
    if (missend.length > 0) { setFouten(missend); return }
    setFouten([])
    if (huidigBlok < blokken.length - 1) {
      setHuidigBlok(huidigBlok + 1)
      window.scrollTo(0, 0)
    } else {
      const scenarios = genereerScenarios({
        antwoorden, geoChecks, dsoData, totaalHectares,
        handmatigeInvoer, grond, bebouwing, locatie
      })
      setScenarios(scenarios)
      navigate('/resultaat')
    }
  }

  const blok = blokken[huidigBlok]

  return (
    <Layout huidigeStap={2}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Blok voortgang */}
        <div className="flex gap-1 mb-8">
          {blokken.map((b, i) => (
            <div key={i} className={`h-1 flex-1 transition-colors ${
              i < huidigBlok ? 'bg-brand-green' : i === huidigBlok ? 'bg-black' : 'bg-brand-gray-light'
            }`} />
          ))}
        </div>

        <p className="text-xs uppercase tracking-widest text-brand-gray-dark mb-2">
          Stap {huidigBlok + 1} van {blokken.length}
        </p>
        <h1 className="text-2xl font-semibold uppercase mb-1">{blok.titel}</h1>
        <p className="text-sm text-brand-gray-dark mb-8">{blok.subtitel}</p>

        <div>{blok.vragen}</div>

        {fouten.length > 0 && (
          <p className="text-xs text-red-600 mb-4">Beantwoord alle verplichte vragen om verder te gaan.</p>
        )}

        <div className="flex gap-3 mt-8">
          {huidigBlok > 0 && (
            <button
              onClick={() => { setHuidigBlok(huidigBlok - 1); window.scrollTo(0, 0) }}
              className="px-6 py-4 text-xs uppercase tracking-widest border border-brand-gray-light hover:border-black transition-colors"
            >
              ← Terug
            </button>
          )}
          <button
            onClick={gaVerder}
            className="flex-1 bg-black text-white font-semibold text-xs uppercase tracking-widest py-4 hover:bg-brand-green hover:text-black transition-colors"
          >
            {huidigBlok < blokken.length - 1 ? 'Volgende →' : 'Genereer scenario\'s →'}
          </button>
        </div>
      </div>
    </Layout>
  )
}
