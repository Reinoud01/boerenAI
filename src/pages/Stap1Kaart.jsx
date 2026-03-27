import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, WMSTileLayer, Marker, GeoJSON, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import useScanStore from '../store/useScanStore'
import { getGemeenteProvincie, getBagVerblijfsobjectVoorPand, checkNatura2000, checkNNN } from '../services/pdokService'
import { checkBestemmingPerceel } from '../services/dsoService'
import { runMilieuChecks }  from '../services/milieuService'
import { runEnergieChecks } from '../services/energieService'
import { runErfgoedChecks } from '../services/erfgoedService'
import { runCbsChecks }     from '../services/cbsService'
import { PROVINCIES, GEMEENTEN_PER_PROVINCIE } from '../data/gemeenteData'
import Layout from '../components/Layout'

const PDOK_BAG_WFS = 'https://service.pdok.nl/lv/bag/wfs/v2_0'

async function getBagPandOpPunt(lat, lng) {
  const params = new URLSearchParams({
    service: 'WFS', version: '2.0.0', request: 'GetFeature',
    typeNames: 'bag:pand',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    CQL_FILTER: `INTERSECTS(geometrie,POINT(${lng} ${lat}))`,
    count: '5',
  })
  try {
    const res = await fetch(`${PDOK_BAG_WFS}?${params}`, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.features?.[0] || null
  } catch (e) {
    return null
  }
}

// Fix Leaflet default icon in Vite/bundled context
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const boerderijIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
})

const GEBOUWTYPES = [
  { key: 'woonhuis',       label: 'Woonhuis',        kort: 'Woonhuis' },
  { key: 'bedrijfswoning', label: 'Bedrijfswoning',   kort: 'Bedrijfsw.' },
  { key: 'stal',           label: 'Stal',             kort: 'Stal' },
  { key: 'schuur',         label: 'Schuur / loods',   kort: 'Schuur' },
  { key: 'kassen',         label: 'Kassen',           kort: 'Kassen' },
  { key: 'overig',         label: 'Overig',           kort: 'Overig' },
]

// Schat categorie op basis van gebruiksdoelen + oppervlakte
function schatCategorie(gebruiksdoelen = [], m2 = 0) {
  const d = gebruiksdoelen.map(g => g.toLowerCase())
  if (d.includes('woonfunctie')) return m2 > 250 ? 'bedrijfswoning' : 'woonhuis'
  if (d.includes('industriefunctie')) return m2 > 500 ? 'stal' : 'schuur'
  if (d.includes('logiesfunctie') || d.includes('bijeenkomstfunctie')) return 'overig'
  // Geen gebruiksdoel (typisch voor agrarische bebouwing)
  return m2 > 600 ? 'stal' : 'schuur'
}

// Bereken oppervlakte in m² van een GeoJSON polygon (Shoelace, EPSG:4326 → m²)
function calcOppervlakteM2(geometry) {
  if (!geometry) return 0
  const ring = geometry.type === 'Polygon'
    ? geometry.coordinates[0]
    : geometry.type === 'MultiPolygon'
    ? geometry.coordinates[0][0]
    : null
  if (!ring || ring.length < 3) return 0
  // Shoelace in lon/lat, schaal naar m² (1° lat ≈ 111320m, 1° lon ≈ 111320 * cos(lat))
  const avgLat = ring.reduce((s, p) => s + p[1], 0) / ring.length
  const cosLat = Math.cos(avgLat * Math.PI / 180)
  let area = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    area += (ring[j][0] - ring[i][0]) * cosLat * 111320 * (ring[j][1] + ring[i][1]) * 111320 / 2
  }
  return Math.abs(area)
}

function KaartKlikHandler({ onPinKlik, onGebouwKlik, pinActief, heeftLocatie }) {
  useMapEvents({
    click: (e) => {
      if (pinActief) {
        onPinKlik(e.latlng.lat, e.latlng.lng)
      } else if (heeftLocatie) {
        onGebouwKlik(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return null
}

export default function Stap1Kaart() {
  const navigate = useNavigate()
  const {
    locatie, setLocatie,
    grond, setGrond,
    bebouwing, setBebouwing, setBebouwingType,
    setGeoCheck, setDsoData,
    setHuidigeStap,
  } = useScanStore()

  const [pinActief, setPinActief]         = useState(!locatie)
  const [ladenLocatie, setLadenLocatie]   = useState(false)
  const [ladenChecks, setLadenChecks]     = useState(false)  // achtergrond geo-checks
  const [geselecteerd, setGeselecteerd]   = useState([])     // [{id, m2, categorie, bron}]
  const [ladenPand, setLadenPand]         = useState(null)   // 'klik' of pandId
  const [fout, setFout]                   = useState(null)
  const [activeSection, setActiveSection] = useState('locatie')

  useEffect(() => { setHuidigeStap(1) }, [])

  // ── Synct geselecteerde gebouwen terug naar de Zustand store ──────────────
  const syncNaarStore = useCallback((lijst) => {
    if (lijst.length === 0) {
      setBebouwing({ heeftGebouwen: false })
      return
    }
    setBebouwing({ heeftGebouwen: true })
    const totalen = {}
    lijst.forEach(g => {
      const m2 = parseFloat(g.m2) || 0
      totalen[g.categorie] = (totalen[g.categorie] || 0) + m2
    })
    GEBOUWTYPES.forEach(({ key }) => {
      const m2 = totalen[key] || 0
      setBebouwingType(key, { aanwezig: m2 > 0, m2: m2 > 0 ? String(Math.round(m2)) : '' })
    })
  }, [setBebouwing, setBebouwingType])

  // ── Achtergrond geo-checks na pinplaatsing ────────────────────────────────
  // Alle checks lopen parallel en vullen de store incrementeel.
  // De boer kan de rest van het formulier alvast invullen.
  const runAchtergrondChecks = useCallback(async (lat, lng, gemeente, provincie) => {
    setLadenChecks(true)

    try {
      // Laag 1A: N2000 + NNN (snel, kritiek voor scenario-engine)
      const bbox = { minLng: lng - 0.005, minLat: lat - 0.005, maxLng: lng + 0.005, maxLat: lat + 0.005 }
      const [n2000, nnn] = await Promise.all([
        checkNatura2000(bbox).catch(() => null),
        checkNNN(bbox).catch(() => null),
      ])
      setGeoCheck('natura2000', n2000)
      setGeoCheck('nnn', nnn)

      const nabijN2000 = n2000?.aanwezig || false

      // Laag 1B: DSO bestemming
      const dso = await checkBestemmingPerceel(lat, lng).catch(() => null)
      if (dso) setDsoData(dso)

      // Laag 2: Milieu + Erfgoed + Energie + CBS — parallel
      const [milieu, erfgoed, energie, cbs] = await Promise.all([
        runMilieuChecks(lat, lng, nabijN2000).catch(() => ({ stikstof: null, bodem: null })),
        runErfgoedChecks(lat, lng).catch(() => ({ monument: null, beschermdGezicht: null, cultuurhistorie: null })),
        runEnergieChecks(lat, lng, provincie).catch(() => ({ energielabel: null, netcongestie: null })),
        runCbsChecks(gemeente).catch(() => ({ bevolking: null, woningdruk: null, woz: null })),
      ])

      // Sla op in store per check-type
      if (milieu.stikstof)        setGeoCheck('stikstof', milieu.stikstof)
      if (milieu.bodem)           setGeoCheck('bodem', milieu.bodem)
      if (erfgoed.monument)       setGeoCheck('monument', erfgoed.monument)
      if (erfgoed.beschermdGezicht) setGeoCheck('beschermdGezicht', erfgoed.beschermdGezicht)
      if (erfgoed.cultuurhistorie)setGeoCheck('cultuurhistorie', erfgoed.cultuurhistorie)
      if (energie.energielabel)   setGeoCheck('energielabel', energie.energielabel)
      if (energie.netcongestie)   setGeoCheck('netcongestie', energie.netcongestie)
      if (cbs)                    setGeoCheck('cbs', cbs)

    } catch (e) {
      console.warn('[Stap1] Achtergrond geo-checks mislukt:', e.message)
    } finally {
      setLadenChecks(false)
    }
  }, [setGeoCheck, setDsoData])

  // ── Pin klikken / slepen op kaart ─────────────────────────────────────────
  const handleKaartKlik = async (lat, lng) => {
    setLadenLocatie(true)
    setFout(null)
    setPinActief(false)
    setGeselecteerd([])
    setLocatie({ lat, lng, gemeente: '', provincie: '' })

    const geo = await getGemeenteProvincie(lat, lng)
    const gemeente  = geo?.gemeente  || ''
    const provincie = geo?.provincie || ''
    setLocatie({ lat, lng, gemeente, provincie })
    setLadenLocatie(false)
    setActiveSection('grond')

    // Start achtergrond-checks asynchroon (blokkeert UX niet)
    runAchtergrondChecks(lat, lng, gemeente, provincie)
  }

  // ── Verwerk een gevonden BAG-pand (na klik op WMS of handmatig) ───────────
  const handlePandKlik = useCallback(async (feature) => {
    const pandId = feature.properties?.identificatie || feature.properties?.id || feature.id
    if (!pandId) return

    // Al geselecteerd? Dan deselecteren
    if (geselecteerd.some(g => g.id === pandId)) {
      const nieuw = geselecteerd.filter(g => g.id !== pandId)
      setGeselecteerd(nieuw)
      syncNaarStore(nieuw)
      return
    }

    setLadenPand(pandId)

    // Schat m² uit geometrie
    const berekendM2 = feature.geometry ? Math.round(calcOppervlakteM2(feature.geometry)) : 0
    let m2 = berekendM2
    let categorie = schatCategorie([], berekendM2)

    const vbo = await getBagVerblijfsobjectVoorPand(pandId)
    if (vbo) {
      m2 = vbo.oppervlakte > 0 ? vbo.oppervlakte : berekendM2
      categorie = schatCategorie(vbo.gebruiksdoelen, m2)
    }

    setLadenPand(null)

    const nieuwGebouw = {
      id: pandId,
      geometry: feature.geometry || null,
      m2: m2 > 0 ? String(Math.round(m2)) : '',
      categorie,
      bron: vbo?.oppervlakte > 0 ? 'BAG' : (berekendM2 > 0 ? 'berekend' : 'handmatig'),
      bouwjaar: feature.properties?.bouwjaar || null,
    }

    const nieuw = [...geselecteerd, nieuwGebouw]
    setGeselecteerd(nieuw)
    syncNaarStore(nieuw)
    setActiveSection('gebouwen')
  }, [geselecteerd, syncNaarStore])

  // ── Gebouw aanklikken op de kaart (WMS-laag → INTERSECTS lookup) ──────────
  const handleGebouwKlikOpKaart = useCallback(async (lat, lng) => {
    setLadenPand('klik')
    setActiveSection('gebouwen')
    const feature = await getBagPandOpPunt(lat, lng)
    setLadenPand(null)

    if (!feature) {
      setFout('Geen gebouw gevonden op dit punt. Klik iets dichter op het oranje vlak, of voeg handmatig toe.')
      setTimeout(() => setFout(null), 4000)
      return
    }

    await handlePandKlik(feature)
  }, [handlePandKlik])

  // ── Gebouw aanpassen (categorie of m²) ────────────────────────────────────
  const updateGebouw = (id, veld, waarde) => {
    const nieuw = geselecteerd.map(g => g.id === id ? { ...g, [veld]: waarde } : g)
    setGeselecteerd(nieuw)
    syncNaarStore(nieuw)
  }

  const verwijderGebouw = (id) => {
    const nieuw = geselecteerd.filter(g => g.id !== id)
    setGeselecteerd(nieuw)
    syncNaarStore(nieuw)
  }

  // ── Handmatig gebouw toevoegen ─────────────────────────────────────────────
  const voegHandmatigToe = () => {
    const nieuw = [...geselecteerd, {
      id: `handmatig-${Date.now()}`,
      m2: '',
      categorie: 'schuur',
      bron: 'handmatig',
      bouwjaar: null,
    }]
    setGeselecteerd(nieuw)
    syncNaarStore(nieuw)
    setActiveSection('gebouwen')
  }

  // Totalen voor samenvatting
  const totaalAgrarischM2 = geselecteerd
    .filter(g => ['stal','schuur','kassen','overig','bedrijfswoning'].includes(g.categorie))
    .reduce((s, g) => s + (parseFloat(g.m2) || 0), 0)

  const kanVolgende = locatie?.gemeente && (grond.hectaresEigendom || grond.hectaresPacht)

  return (
    <Layout huidigeStap={1}>
      <div className="flex h-[calc(100vh-64px)]">

        {/* ── Kaart ─────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {pinActief && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999] bg-black text-white text-xs uppercase tracking-widest px-5 py-2.5 pointer-events-none">
              Klik op de kaart om uw locatie te markeren
            </div>
          )}
          {ladenLocatie && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999] bg-brand-green text-black text-xs uppercase tracking-widest px-5 py-2.5">
              Locatie bepalen…
            </div>
          )}
          {ladenPand && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[9999] bg-white border border-brand-gray-light text-black text-xs uppercase tracking-widest px-5 py-2.5">
              {ladenPand === 'klik' ? 'Gebouw zoeken…' : 'Gebouwinfo ophalen…'}
            </div>
          )}
          {ladenChecks && !ladenLocatie && (
            <div className="absolute bottom-3 left-3 z-[9999] bg-white/90 border border-brand-gray-light text-brand-gray-dark text-[10px] uppercase tracking-widest px-3 py-1.5 flex items-center gap-2">
              <span className="animate-pulse">●</span> Gebiedsdata laden…
            </div>
          )}

          <MapContainer
            center={[52.3, 5.3]}
            zoom={8}
            style={{ height: '100%', width: '100%', cursor: pinActief ? 'crosshair' : 'grab' }}
          >
            <TileLayer
              url="https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.pdok.nl">PDOK</a> / Kadaster'
              maxZoom={19}
            />

            {locatie && (
              <Marker
                position={[locatie.lat, locatie.lng]}
                icon={boerderijIcon}
                draggable={true}
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng()
                    handleKaartKlik(lat, lng)
                  }
                }}
              />
            )}
            <KaartKlikHandler
              onPinKlik={handleKaartKlik}
              onGebouwKlik={() => {}}
              pinActief={pinActief}
              heeftLocatie={false}
            />
          </MapContainer>

          {locatie && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white border border-brand-gray-light px-4 py-2 space-y-1">
              <p className="text-[10px] text-brand-gray-mid uppercase tracking-wide">Pin verplaatsen:</p>
              <p className="text-xs text-brand-gray-dark">Sleep de pin of klik op</p>
              <button
                onClick={() => setPinActief(true)}
                className={`text-xs uppercase tracking-wide hover:underline font-semibold ${pinActief ? 'text-brand-green' : ''}`}
              >
                {pinActief ? '⊙ Klik op kaart…' : '↩ Locatie opnieuw klikken'}
              </button>
            </div>
          )}
        </div>

        {/* ── Zijpaneel ──────────────────────────────────────────────────── */}
        <div className="w-96 border-l border-brand-gray-light bg-white flex flex-col overflow-y-auto">
          <div className="p-5 border-b border-brand-gray-light">
            <h2 className="text-xs uppercase tracking-widest font-semibold mb-1">Stap 1 — Uw bedrijf</h2>
            <p className="text-xs text-brand-gray-dark leading-relaxed">
              Klik op de kaart om uw locatie te markeren. Vul uw grond in en selecteer uw gebouwen.
            </p>
          </div>

          {/* SECTIE 1: LOCATIE */}
          <SectieKop label="1. Locatie" actief={activeSection === 'locatie'} compleet={!!locatie?.gemeente} onClick={() => setActiveSection('locatie')} />
          {activeSection === 'locatie' && (
            <div className="px-5 pb-5 border-b border-brand-gray-light">
              {locatie?.gemeente ? (
                <div className="bg-brand-green p-4 mb-4">
                  <p className="text-xs uppercase tracking-widest font-semibold mb-1">Locatie vastgelegd</p>
                  <p className="text-sm font-semibold">{locatie.gemeente}</p>
                  <p className="text-xs text-brand-gray-dark">{locatie.provincie}</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-brand-gray-light p-4 mb-4 text-xs text-brand-gray-dark">
                  Klik op de kaart om een pin te plaatsen op uw boerderij.
                </div>
              )}
              <p className="text-xs uppercase tracking-wide font-semibold mb-3">Of selecteer handmatig:</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide mb-1">Provincie</label>
                  <select value={locatie?.provincie || ''} onChange={e => setLocatie({ ...(locatie || {}), provincie: e.target.value, gemeente: '' })}
                    className="w-full border border-brand-gray-light px-3 py-2 text-sm bg-white focus:border-black outline-none">
                    <option value="">Selecteer provincie</option>
                    {PROVINCIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide mb-1">Gemeente</label>
                  <select value={locatie?.gemeente || ''} onChange={e => setLocatie({ ...(locatie || {}), gemeente: e.target.value })}
                    disabled={!locatie?.provincie}
                    className="w-full border border-brand-gray-light px-3 py-2 text-sm bg-white focus:border-black outline-none disabled:bg-gray-50 disabled:text-brand-gray-mid">
                    <option value="">Selecteer gemeente</option>
                    {(GEMEENTEN_PER_PROVINCIE[locatie?.provincie] || []).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              {locatie?.gemeente && (
                <button onClick={() => setActiveSection('grond')} className="mt-4 w-full bg-black text-white text-xs uppercase tracking-widest py-3 hover:bg-brand-green hover:text-black transition-colors">
                  Verder: Uw grond →
                </button>
              )}
            </div>
          )}

          {/* SECTIE 2: GROND */}
          <SectieKop label="2. Uw grond" actief={activeSection === 'grond'} compleet={!!(grond.hectaresEigendom || grond.hectaresPacht)} onClick={() => setActiveSection('grond')} />
          {activeSection === 'grond' && (
            <div className="px-5 pb-5 border-b border-brand-gray-light space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wide mb-1">Ha in eigendom</label>
                  <input type="number" min="0" step="0.1" value={grond.hectaresEigendom}
                    onChange={e => setGrond({ hectaresEigendom: e.target.value })}
                    className="w-full border border-brand-gray-light px-3 py-2 text-sm focus:border-black outline-none" placeholder="bijv. 45" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide mb-1">Ha in pacht</label>
                  <input type="number" min="0" step="0.1" value={grond.hectaresPacht}
                    onChange={e => setGrond({ hectaresPacht: e.target.value })}
                    className="w-full border border-brand-gray-light px-3 py-2 text-sm focus:border-black outline-none" placeholder="bijv. 20" />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide mb-2">Soort grond <span className="text-brand-gray-mid normal-case">(meerdere mogelijk)</span></label>
                <div className="flex flex-wrap gap-2">
                  {[{v:'bouwland',l:'Bouwland'},{v:'grasland',l:'Grasland'},{v:'natuur',l:'Natuur'},{v:'tuinbouw',l:'Tuinbouw'},{v:'overig',l:'Overig'}].map(o => {
                    const actief = (grond.grondtypes || []).includes(o.v)
                    return (
                      <button key={o.v} onClick={() => {
                        const huidig = grond.grondtypes || []
                        const nieuw = actief ? huidig.filter(t => t !== o.v) : [...huidig, o.v]
                        setGrond({ grondtypes: nieuw, grondtype: nieuw[0] || '' })
                      }}
                        className={`px-3 py-1.5 text-xs uppercase tracking-wide border transition-colors ${actief ? 'bg-black text-white border-black' : 'border-brand-gray-light hover:border-black'}`}>
                        {o.l}
                      </button>
                    )
                  })}
                </div>
              </div>
              {(grond.hectaresEigendom || grond.hectaresPacht) && (
                <div className="bg-brand-green p-3 text-xs">
                  <span className="font-semibold">{(parseFloat(grond.hectaresEigendom)||0)+(parseFloat(grond.hectaresPacht)||0)} ha totaal</span>
                  {grond.hectaresPacht ? ` (${grond.hectaresEigendom||0} ha eigen + ${grond.hectaresPacht} ha pacht)` : ''}
                  {(grond.grondtypes || []).length > 0 && (
                    <span className="ml-2 text-brand-gray-dark">· {(grond.grondtypes).join(', ')}</span>
                  )}
                </div>
              )}
              <button onClick={() => setActiveSection('gebouwen')} disabled={!(grond.hectaresEigendom || grond.hectaresPacht)}
                className="w-full bg-black text-white text-xs uppercase tracking-widest py-3 hover:bg-brand-green hover:text-black transition-colors disabled:bg-brand-gray-mid">
                Verder: Uw gebouwen →
              </button>
            </div>
          )}

          {/* SECTIE 3: GEBOUWEN */}
          <SectieKop
            label={`3. Gebouwen op het erf${geselecteerd.length > 0 ? ` (${geselecteerd.length})` : ''}`}
            actief={activeSection === 'gebouwen'}
            compleet={geselecteerd.length > 0 || bebouwing.heeftGebouwen === false}
            onClick={() => setActiveSection('gebouwen')}
          />
          {activeSection === 'gebouwen' && (
            <div className="px-5 pt-5 pb-5 border-b border-brand-gray-light space-y-4">

              {/* Lijst geselecteerde gebouwen */}
              {geselecteerd.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest font-semibold">Uw gebouwen ({geselecteerd.length})</p>
                  {geselecteerd.map((gebouw, i) => (
                    <GebouwRij
                      key={gebouw.id}
                      gebouw={gebouw}
                      nr={i + 1}
                      onChange={(veld, val) => updateGebouw(gebouw.id, veld, val)}
                      onVerwijder={() => verwijderGebouw(gebouw.id)}
                    />
                  ))}
                </div>
              )}

              {/* Handmatig toevoegen */}
              <button onClick={voegHandmatigToe}
                className="w-full bg-black text-white text-xs uppercase tracking-widest font-semibold py-4 hover:bg-brand-green hover:text-black transition-colors mt-2">
                + Gebouw toevoegen
              </button>

              {/* Geen gebouwen toggle — alleen tonen als nog niets geselecteerd */}
              {geselecteerd.length === 0 && (
                <div>
                  <p className="text-xs text-brand-gray-mid mb-2 text-center">of</p>
                  <button
                    onClick={() => setBebouwing({ heeftGebouwen: false })}
                    className={`w-full py-2 text-xs uppercase tracking-wide border transition-colors ${bebouwing.heeftGebouwen === false ? 'bg-black text-white border-black' : 'border-brand-gray-light hover:border-black text-brand-gray-dark'}`}>
                    Geen gebouwen op het erf
                  </button>
                </div>
              )}

              {/* Samenvatting m² */}
              {geselecteerd.length > 0 && (
                <div className="bg-gray-50 border border-brand-gray-light p-3 space-y-1">
                  <p className="text-xs uppercase tracking-widest font-semibold mb-2">Totaal bebouwing</p>
                  {Object.entries(
                    geselecteerd.reduce((acc, g) => {
                      const m2 = parseFloat(g.m2) || 0
                      acc[g.categorie] = (acc[g.categorie] || 0) + m2
                      return acc
                    }, {})
                  ).map(([cat, m2]) => (
                    <p key={cat} className="text-xs flex justify-between">
                      <span>{GEBOUWTYPES.find(t => t.key === cat)?.label || cat}</span>
                      <span className={`font-semibold ${m2 === 0 ? 'text-red-500' : ''}`}>{m2 > 0 ? `${m2} m²` : '⚠ vul m² in'}</span>
                    </p>
                  ))}
                  {totaalAgrarischM2 >= 500 && (
                    <p className="text-xs text-green-700 font-semibold mt-2 pt-2 border-t border-brand-gray-light">
                      ✓ {Math.round(totaalAgrarischM2)} m² agrarisch → rood-voor-rood kansen
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {fout && (
            <div className="px-5 py-3 bg-red-50 border-t border-red-200">
              <p className="text-xs text-red-700">{fout}</p>
            </div>
          )}

          <div className="mt-auto p-4 border-t border-brand-gray-light">
            <div className="flex gap-1 mb-3">
              <VoortgangDot compleet={!!locatie?.gemeente} label="Locatie" />
              <VoortgangDot compleet={!!(grond.hectaresEigendom || grond.hectaresPacht)} label="Grond" />
              <VoortgangDot compleet={geselecteerd.length > 0 || bebouwing.heeftGebouwen === false} label="Gebouwen" />
            </div>
            <button onClick={() => { if (!kanVolgende) { setFout('Vul uw locatie en hectares in.'); return } navigate('/vragen') }}
              disabled={!kanVolgende}
              className="w-full bg-black text-white font-semibold text-xs uppercase tracking-widest py-4 hover:bg-brand-green hover:text-black transition-colors disabled:bg-brand-gray-mid disabled:cursor-not-allowed">
              {kanVolgende
                ? `Naar uw situatie — ${(parseFloat(grond.hectaresEigendom)||0)+(parseFloat(grond.hectaresPacht)||0)} ha →`
                : 'Vul locatie en hectares in'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

// ── Subcomponenten ────────────────────────────────────────────────────────────

function SectieKop({ label, actief, compleet, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between px-5 py-3.5 text-xs uppercase tracking-widest font-semibold border-b border-brand-gray-light transition-colors text-left ${actief ? 'bg-black text-white' : 'hover:bg-gray-50'}`}>
      <span>{label}</span>
      <span>{compleet ? '✓' : (actief ? '▲' : '▼')}</span>
    </button>
  )
}

function GebouwRij({ gebouw, nr, onChange, onVerwijder }) {
  const ontbreektM2 = !gebouw.m2 || parseFloat(gebouw.m2) === 0

  return (
    <div className={`border ${ontbreektM2 ? 'border-amber-300' : 'border-brand-gray-light'} bg-white`}>
      {/* Compacte header: nummer, bron/bouwjaar, verwijder */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-gray-light bg-gray-50">
        <span className="text-xs font-semibold text-brand-gray-dark">Gebouw #{nr}</span>
        <div className="flex items-center gap-2">
          {gebouw.bouwjaar && (
            <span className="text-xs text-brand-gray-mid">{gebouw.bouwjaar}</span>
          )}
          <span className="text-xs text-brand-gray-mid italic">{gebouw.bron}</span>
          <button onClick={onVerwijder} className="text-brand-gray-mid hover:text-black text-sm leading-none ml-1">✕</button>
        </div>
      </div>

      {/* Type + m² op één rij */}
      <div className="flex gap-2 px-3 py-2.5 items-center">
        <select
          value={gebouw.categorie}
          onChange={e => onChange('categorie', e.target.value)}
          className="flex-1 border border-brand-gray-light px-2 py-1.5 text-xs bg-white focus:border-black outline-none"
        >
          {GEBOUWTYPES.map(t => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            type="number" min="0" step="10"
            value={gebouw.m2}
            onChange={e => onChange('m2', e.target.value)}
            className={`w-20 border px-2 py-1.5 text-xs text-right focus:border-black outline-none ${ontbreektM2 ? 'border-amber-400 bg-amber-50' : 'border-brand-gray-light'}`}
            placeholder="m²"
          />
          <span className="text-xs text-brand-gray-mid">m²</span>
        </div>
      </div>

      {ontbreektM2 && (
        <p className="text-xs text-amber-600 px-3 pb-2">⚠ Vul het oppervlak in</p>
      )}
    </div>
  )
}

function VoortgangDot({ compleet, label }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${compleet ? 'bg-black' : 'bg-brand-gray-light'}`} />
      <span className="text-[10px] uppercase tracking-wide text-brand-gray-dark">{label}</span>
    </div>
  )
}
