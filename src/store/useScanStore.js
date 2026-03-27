import { create } from 'zustand'

const useScanStore = create((set, get) => ({
  // Stap 1: locatie (pin op kaart)
  locatie: null,         // { lat, lng, gemeente, provincie }

  // Stap 1: grond
  grond: {
    hectaresEigendom: '',
    hectaresPacht: '',
    grondtype: '',
  },

  // Stap 1: bebouwing
  bebouwing: {
    heeftGebouwen: null,
    woonhuis:       { aanwezig: false, m2: '' },
    bedrijfswoning: { aanwezig: false, m2: '' },
    stal:           { aanwezig: false, m2: '' },
    schuur:         { aanwezig: false, m2: '' },
    kassen:         { aanwezig: false, m2: '' },
    overig:         { aanwezig: false, m2: '', omschrijving: '' },
  },

  // Legacy
  percelen: [],
  totaalHectares: 0,
  handmatigeInvoer: null,

  // Geo-checks
  geoChecks: {
    natura2000:      null,   // { aanwezig, gebieden[] }
    nnn:             null,   // { aanwezig }
    grondwater:      null,   // legacy
    stikstof:        null,   // { overbelast, kritischGebied, toelichting } — milieuService
    bodem:           null,   // { saneringAlert, aantalBooronderzoeken, toelichting } — milieuService
    monument:        null,   // { aanwezig, monumenten[] } — erfgoedService
    beschermdGezicht:null,   // { aanwezig, naam } — erfgoedService
    cultuurhistorie: null,   // { aanwezig, elementen[] } — erfgoedService
    energielabel:    null,   // { gevonden, gemiddeldLabel } — energieService
    netcongestie:    null,   // { status, netbeheerder, toelichting } — energieService
    cbs:             null,   // { bevolking, woningdruk, woz } — cbsService
  },

  // DSO / Omgevingswet
  dsoData: null,

  // Stap 2: vragenlijst
  antwoorden: {
    // Blok 1 — Uw bedrijf
    bedrijfstype: '',
    hectaresEigendom: '',
    hectaresPacht: '',
    provincie: '',
    heeftOpvolger: '',

    // Blok 2 — Uw positie
    contactOverheid: '',
    nabijNatura2000: '',
    taxatieGedaan: '',

    // Blok 3 — Uw wensen
    wensen: [],               // ['verkopen','deels_verkopen','functiewijziging','landgoed','verpachten','weet_niet']
    functieWensen: [],        // ['wonen','recreatie','zorg','energie','natuur','bedrijfsruimte'] — welke functies?
    tijdshorizon: '',
    financieelDoel: '',

    // Blok 4 — Uw erf & plannen (nieuw)
    bouwkundigeStaat: '',     // goed / matig / slecht
    asbestAanwezig: '',       // ja / nee / weet_niet
    rolNaTransitie: '',       // actief / passief / maakt_niet_uit
    ervaringVastgoed: '',     // ja / nee

    // Blok 5 — Financiën & beperkingen
    eigenVermogen: '',        // <50k / 50-150k / 150-500k / >500k
    rechtsVorm: '',           // eenmanszaak / maatschap / bv / cv / anders
    heeftHypotheek: '',
    heeftPachtcontract: '',
    heeftFOR: '',
    wiltHobbydieren: '',  // ja / nee / maakt_niet_uit — bij veehouderij
    specifiekeWensen: '',
  },

  // Stap 3: gegenereerde scenario's
  scenarios: [],

  // Huidige stap
  huidigeStap: 0,

  // Actions
  setHuidigeStap: (stap) => set({ huidigeStap: stap }),

  voegPerceelToe: (perceel) => set((state) => {
    const bestaat = state.percelen.find(p => p.id === perceel.id)
    if (bestaat) return state
    const nieuweLijst = [...state.percelen, perceel]
    return {
      percelen: nieuweLijst,
      totaalHectares: +(nieuweLijst.reduce((sum, p) => sum + (p.hectares || 0), 0)).toFixed(2)
    }
  }),

  verwijderParceel: (id) => set((state) => {
    const nieuweLijst = state.percelen.filter(p => p.id !== id)
    return {
      percelen: nieuweLijst,
      totaalHectares: +(nieuweLijst.reduce((sum, p) => sum + (p.hectares || 0), 0)).toFixed(2)
    }
  }),

  togglePerceel: (perceel) => {
    const state = get()
    const bestaat = state.percelen.find(p => p.id === perceel.id)
    if (bestaat) get().verwijderParceel(perceel.id)
    else get().voegPerceelToe(perceel)
  },

  setLocatie:       (locatie)   => set({ locatie }),
  setGrond:         (grond)     => set((state) => ({ grond: { ...state.grond, ...grond } })),
  setBebouwing:     (bebouwing) => set((state) => ({ bebouwing: { ...state.bebouwing, ...bebouwing } })),
  setBebouwingType: (type, waarde) => set((state) => ({
    bebouwing: { ...state.bebouwing, [type]: { ...state.bebouwing[type], ...waarde } }
  })),
  setHandmatigeInvoer: (invoer) => set({ handmatigeInvoer: invoer }),
  setGeoCheck:      (type, waarde) => set((state) => ({
    geoChecks: { ...state.geoChecks, [type]: waarde }
  })),
  setDsoData:       (data) => set({ dsoData: data }),

  setAntwoord: (key, value) => set((state) => ({
    antwoorden: { ...state.antwoorden, [key]: value }
  })),

  toggleWens: (wens) => set((state) => {
    const wensen = state.antwoorden.wensen
    const nieuweWensen = wensen.includes(wens)
      ? wensen.filter(w => w !== wens)
      : [...wensen, wens]
    return { antwoorden: { ...state.antwoorden, wensen: nieuweWensen } }
  }),

  toggleFunctieWens: (wens) => set((state) => {
    const fw = state.antwoorden.functieWensen
    const nieuw = fw.includes(wens) ? fw.filter(w => w !== wens) : [...fw, wens]
    return { antwoorden: { ...state.antwoorden, functieWensen: nieuw } }
  }),

  setScenarios: (scenarios) => set({ scenarios }),

  resetScan: () => set({
    locatie: null,
    grond: { hectaresEigendom: '', hectaresPacht: '', grondtype: '' },
    bebouwing: {
      heeftGebouwen: null,
      woonhuis:       { aanwezig: false, m2: '' },
      bedrijfswoning: { aanwezig: false, m2: '' },
      stal:           { aanwezig: false, m2: '' },
      schuur:         { aanwezig: false, m2: '' },
      kassen:         { aanwezig: false, m2: '' },
      overig:         { aanwezig: false, m2: '', omschrijving: '' },
    },
    percelen: [], totaalHectares: 0, handmatigeInvoer: null,
    geoChecks: {
      natura2000: null, nnn: null, grondwater: null,
      stikstof: null, bodem: null, monument: null,
      beschermdGezicht: null, cultuurhistorie: null,
      energielabel: null, netcongestie: null, cbs: null,
    },
    dsoData: null,
    antwoorden: {
      bedrijfstype: '', hectaresEigendom: '', hectaresPacht: '',
      provincie: '', heeftOpvolger: '', contactOverheid: '',
      nabijNatura2000: '', taxatieGedaan: '',
      wensen: [], functieWensen: [], tijdshorizon: '', financieelDoel: '',
      bouwkundigeStaat: '', asbestAanwezig: '', rolNaTransitie: '', ervaringVastgoed: '',
      eigenVermogen: '', rechtsVorm: '',
      heeftHypotheek: '', heeftPachtcontract: '', heeftFOR: '', wiltHobbydieren: '', specifiekeWensen: '',
    },
    scenarios: [], huidigeStap: 0
  }),
}))

export default useScanStore
