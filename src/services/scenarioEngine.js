/**
 * Scenario Engine v2 — Boer Transitie Scanner
 *
 * Genereert 3–6 gematchte scenario's + volledige catalogus van alle opties.
 * Elk scenario bevat kengetallen (investering, inkomsten, doorlooptijd, risico)
 * op basis van de ingevoerde situatie.
 */

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function euro(getal) {
  if (getal >= 1_000_000) return `€${(getal / 1_000_000).toFixed(1).replace('.', ',')} mln`
  if (getal >= 1_000)     return `€${Math.round(getal / 1_000)}k`
  return `€${getal}`
}

function bereik(min, max, suffix = '') {
  return `${euro(min)} – ${euro(max)}${suffix ? ' ' + suffix : ''}`
}

// Bouwkosten multiplier op basis van bouwkundige staat
function bouwMultiplier(staat) {
  if (staat === 'goed')    return [1.0, 1.2]
  if (staat === 'matig')   return [1.2, 1.5]
  if (staat === 'slecht')  return [1.5, 2.0]
  return [1.1, 1.4] // wisselend / onbekend
}

// Asbest-opslag (€/m²)
function asbestOpslag(asbest, m2) {
  if (asbest === 'ja')       return m2 * 35   // indicatief €35/m²
  if (asbest === 'weet_niet') return m2 * 15  // PM-opslag
  return 0
}

// ─── KENGETALLEN BEREKENING PER SCENARIO ─────────────────────────────────────

function kengetallenVabWonen({ m2, staat, asbest }) {
  const m2Verb = Math.max(m2, 100)
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, m2Verb)
  const invMin = Math.round((m2Verb * 900 * mLo + asb) / 10000) * 10000
  const invMax = Math.round((m2Verb * 1400 * mHi + asb) / 10000) * 10000
  const woningen = Math.max(1, Math.floor(m2Verb / 110))
  const huurMin = Math.round(woningen * 110 * 10.5 * 12 * 0.98 / 1000) * 1000
  const huurMax = Math.round(woningen * 110 * 14   * 12 * 0.98 / 1000) * 1000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    bereik(huurMin, huurMax, '/jr'),
    inkomstenType:'Huurinkomsten',
    doorlooptijd: '3 – 5 jaar',
    risico:       'Beperkt',
    kennis:       'Gemiddeld',
  }
}

function kengetallenRoodVoorRood({ m2, staat, asbest, provincie }) {
  const m2Sloop = Math.max(m2, 500)
  const asb = asbestOpslag(asbest, m2Sloop)
  const sloopMin = Math.round((m2Sloop * 25 + asb) / 5000) * 5000
  const sloopMax = Math.round((m2Sloop * 60 + asb) / 5000) * 5000
  const woningen = Math.max(1, Math.floor(m2Sloop / 800))
  const kavelMin = woningen * 150_000
  const kavelMax = woningen * 350_000
  return {
    investering:  bereik(sloopMin, sloopMax, '(sloopkosten)'),
    inkomsten:    bereik(kavelMin, kavelMax, '(kavelbijdrage)'),
    inkomstenType:'Kavelbijdrage',
    doorlooptijd: '2 – 4 jaar',
    risico:       'Beperkt',
    kennis:       'Laag',
  }
}

function kengetallenNSW({ ha }) {
  const haGebied = Math.max(ha, 5)
  const invMin = haGebied * 5_000
  const invMax = haGebied * 20_000
  return {
    investering:  bereik(invMin, invMax, '(inrichting)'),
    inkomsten:    'NSW-vrijstellingen + subsidie',
    inkomstenType:'Belastingvoordeel',
    doorlooptijd: '3 – 7 jaar',
    risico:       'Gemiddeld',
    kennis:       'Hoog',
  }
}

function kengetallenLbv({ nabijN2000 }) {
  return {
    investering:  'Geen investering vereist',
    inkomsten:    nabijN2000 ? '€200k – €2 mln+ (uitkoop)' : 'Afhankelijk van regeling',
    inkomstenType:'Uitkoopvergoeding',
    doorlooptijd: '6 – 18 maanden',
    risico:       'Laag',
    kennis:       'Laag',
  }
}

function kengetallenZorgboerderij({ m2, staat, asbest }) {
  const m2Verb = Math.max(m2, 150)
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, m2Verb)
  const invMin = Math.round((m2Verb * 500 * mLo + asb + 30_000) / 5000) * 5000
  const invMax = Math.round((m2Verb * 900 * mHi + asb + 80_000) / 5000) * 5000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    '€50k – €150k/jr',
    inkomstenType:'WMO-vergoeding',
    doorlooptijd: '1 – 3 jaar',
    risico:       'Gemiddeld',
    kennis:       'Hoog',
  }
}

function kengetallenRecreatie({ m2, staat, asbest }) {
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, Math.max(m2, 100))
  const invMin = Math.round((50_000 * mLo + asb) / 5000) * 5000
  const invMax = Math.round((300_000 * mHi + asb) / 5000) * 5000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    '€30k – €100k/jr',
    inkomstenType:'Seizoensinkomsten',
    doorlooptijd: '1 – 3 jaar',
    risico:       'Gemiddeld',
    kennis:       'Gemiddeld',
  }
}

function kengetallenVakantiewoningen({ m2, staat, asbest }) {
  const units = Math.max(1, Math.floor(Math.max(m2, 100) / 60))
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, Math.max(m2, 100))
  const invMin = Math.round((units * 50_000 * mLo + asb) / 5000) * 5000
  const invMax = Math.round((units * 130_000 * mHi + asb) / 5000) * 5000
  const inkMin = units * 18_000
  const inkMax = units * 55_000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    bereik(inkMin, inkMax, '/jr'),
    inkomstenType:'Verhuurinkomsten',
    doorlooptijd: '1 – 3 jaar',
    risico:       'Beperkt',
    kennis:       'Gemiddeld',
  }
}

function kengetallenZonnepanelen({ m2Dak, staat }) {
  const dakM2 = Math.max(m2Dak * 0.6, 100) // bruikbaar dakoppervlak
  const kWp = Math.round(dakM2 / 7)         // ~7 m² per kWp
  const invMin = kWp * 600
  const invMax = kWp * 1_000
  const opbrMin = kWp * 150   // €/kWp/jr (saldering + SDE)
  const opbrMax = kWp * 250
  return {
    investering:  bereik(invMin, invMax, `(±${kWp} kWp)`),
    inkomsten:    bereik(opbrMin, opbrMax, '/jr'),
    inkomstenType:'Energie-opbrengst',
    doorlooptijd: '6 – 18 maanden',
    risico:       'Laag',
    kennis:       'Laag',
  }
}

function kengetallenBedrijfsruimte({ m2, staat, asbest }) {
  const m2Verb = Math.max(m2, 200)
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, m2Verb)
  const invMin = Math.round((m2Verb * 80  * mLo + asb) / 5000) * 5000
  const invMax = Math.round((m2Verb * 220 * mHi + asb) / 5000) * 5000
  const huurMin = Math.round(m2Verb * 40 / 1000) * 1000
  const huurMax = Math.round(m2Verb * 80 / 1000) * 1000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    bereik(huurMin, huurMax, '/jr'),
    inkomstenType:'Huurinkomsten',
    doorlooptijd: '6 maanden – 2 jaar',
    risico:       'Laag',
    kennis:       'Laag',
  }
}

function kengetallenNatuur({ ha }) {
  const haGebied = Math.max(ha, 2)
  const subsidieMin = haGebied * 200
  const subsidieMax = haGebied * 500
  return {
    investering:  bereik(haGebied * 2_000, haGebied * 8_000, '(aanleg)'),
    inkomsten:    bereik(subsidieMin, subsidieMax, '/jr (ANLB/SNL)'),
    inkomstenType:'Subsidie',
    doorlooptijd: '1 – 3 jaar',
    risico:       'Laag',
    kennis:       'Gemiddeld',
  }
}

function kengetallenVerkoop({ ha, m2, heeftPacht }) {
  const grondMin = ha * 50_000
  const grondMax = ha * 120_000
  const gebouwenWaarde = m2 * 300
  const korting = heeftPacht === 'ja' ? 0.6 : 1.0
  return {
    investering:  'Geen investering vereist',
    inkomsten:    bereik(
      Math.round((grondMin + gebouwenWaarde) * korting / 10000) * 10000,
      Math.round((grondMax + gebouwenWaarde) * korting / 10000) * 10000,
      '(totaal)'
    ),
    inkomstenType:'Verkoopprijs',
    doorlooptijd: '3 – 12 maanden',
    risico:       'Laag',
    kennis:       'Laag',
  }
}

function kengetallenVerpachten({ ha }) {
  const haGe = Math.max(ha, 1)
  return {
    investering:  'Geen investering vereist',
    inkomsten:    bereik(haGe * 300, haGe * 750, '/jr'),
    inkomstenType:'Pachtinkomsten',
    doorlooptijd: 'Direct',
    risico:       'Laag',
    kennis:       'Laag',
  }
}

function kengetallenAgrifood({ m2, staat, asbest }) {
  const [mLo, mHi] = bouwMultiplier(staat)
  const asb = asbestOpslag(asbest, 200)
  const invMin = Math.round((30_000 * mLo + asb) / 5000) * 5000
  const invMax = Math.round((150_000 * mHi + asb) / 5000) * 5000
  return {
    investering:  bereik(invMin, invMax),
    inkomsten:    '€25k – €90k/jr',
    inkomstenType:'Omzet streekproducten',
    doorlooptijd: '6 maanden – 2 jaar',
    risico:       'Gemiddeld',
    kennis:       'Hoog',
  }
}

// ─── VOLLEDIGE CATALOGUS (zijbalk) ───────────────────────────────────────────

export const ALLE_SCENARIOS = [
  { id: 'vab_wonen',       naam: 'VAB Woningbouw',               icoon: '🏠', categorie: 'Bebouwing' },
  { id: 'rood_voor_rood',  naam: 'Rood-voor-rood',               icoon: '🏗️', categorie: 'Bebouwing' },
  { id: 'vakantiewoningen',naam: 'Vakantiewoningen / B&B',        icoon: '🏕️', categorie: 'Bebouwing' },
  { id: 'bedrijfsruimte',  naam: 'Bedrijfsruimte verhuur',        icoon: '🏭', categorie: 'Bebouwing' },
  { id: 'zorgboerderij',   naam: 'Zorgboerderij',                 icoon: '🌿', categorie: 'Functie' },
  { id: 'recreatie',       naam: 'Recreatie & Camping',           icoon: '⛺', categorie: 'Functie' },
  { id: 'kinderopvang',    naam: 'Kinderopvang / BSO',            icoon: '🧒', categorie: 'Functie' },
  { id: 'dagrecreatie',    naam: 'Dagrecreatie',                  icoon: '🚜', categorie: 'Functie' },
  { id: 'agrifood',        naam: 'Agrifood / Streekproducten',    icoon: '🛒', categorie: 'Functie' },
  { id: 'erfdelen',        naam: 'Erfdelen',                      icoon: '🔀', categorie: 'Functie' },
  { id: 'nsw',             naam: 'NSW Landgoed',                  icoon: '🌳', categorie: 'Grond' },
  { id: 'natuur',          naam: 'Natuur & Voedselbos',           icoon: '🌱', categorie: 'Grond' },
  { id: 'rood_voor_groen', naam: 'Rood-voor-Groen',               icoon: '🌿', categorie: 'Grond' },
  { id: 'verpachten',      naam: 'Verpachten',                    icoon: '📋', categorie: 'Grond' },
  { id: 'verkoop',         naam: 'Verkoop',                       icoon: '💰', categorie: 'Grond' },
  { id: 'zonnepanelen',    naam: 'Zonnepanelen (dak)',             icoon: '☀️', categorie: 'Energie' },
  { id: 'zonnepark',       naam: 'Grondgebonden zonnepark',       icoon: '⚡', categorie: 'Energie' },
  { id: 'windenergie',     naam: 'Windenergie',                   icoon: '💨', categorie: 'Energie' },
  { id: 'lbv',                naam: 'Beëindigingsregeling (Lbv)',    icoon: '🏛️', categorie: 'Stoppers' },
  { id: 'sloop',              naam: 'Sloop zonder vervanging',       icoon: '🔨', categorie: 'Stoppers' },
  { id: 'hobbydieren',        naam: 'Hobbydieren houden',            icoon: '🐓', categorie: 'Stoppers' },
  { id: 'akkerbouw_doorstart',naam: 'Overstap naar akkerbouw',       icoon: '🌾', categorie: 'Stoppers' },
]

// ─── PROVINCIE CONTEXT ────────────────────────────────────────────────────────
// Provinciespecifieke beleidsinformatie per scenario-type.
// Bronnen: provinciale omgevingsverordeningen, kennisbank, RLI-rapporten.
// ─────────────────────────────────────────────────────────────────────────────

const PROVINCIE_DATA = {
  'Noord-Holland': {
    vab: {
      beleid:        'actief',
      toelichting:   'Noord-Holland heeft een stevige woningbouwopgave (100.000+ woningen tot 2030). Gemeenten als Gooise Meren, Waterland en Alkmaar werken mee aan VAB-initiatieven in het buitengebied.',
      aandacht:      'Welstandseisen zijn streng in Noord-Holland, met name in beschermd landelijk gebied (Laag Holland).',
      subsidie:      'Provinciale woondeals en Regionale Woningbouwprogramma\'s — vraag gemeente naar aandeel vrije sector.',
    },
    roodVoorRood:   'Noord-Holland kent een ruimte-voor-ruimte variant, uitvoering per gemeente. Vraag de gemeente naar het sloopbonus-beleid.',
    nsw:            'Noord-Holland heeft beperkte landgoedincentives maar NSW-rangschikking is landelijk geregeld. Goede kansen bij riet- en veengebieden.',
    recreatie:      'Sterke toeristische vraag (Amsterdam-regio, kust) — vakantiewoningen en glamping kansrijk, met name in Waterland en Noord-Kennemerland.',
    natuur:         'Waardevolle natte natuur (veenweidegebied, Natura2000). ANLb-collectieven actief in Noord-Holland. SKNL-subsidie beschikbaar.',
    lbv:            'Noord-Holland heeft relatief weinig intensieve veehouderij — LBV-kansen beperkter dan in Brabant of Gelderland.',
    woningmarkt:    'Gespannen woningmarkt, met name AMR (Amsterdamse Metropoolregio). Huurprijzen hoog — VAB-verhuur financieel aantrekkelijk.',
  },
  'Noord-Brabant': {
    vab: {
      beleid:        'actief',
      toelichting:   'Noord-Brabant is koploper VAB-beleid in Nederland. De Brabantse Omgevingsvisie stimuleert erftransformatie actief. Gemeenten hebben ruime ervaring met VAB-procedures.',
      aandacht:      'Stikstofproblematiek speelt sterk in Brabant — vergunningverlening voor nieuwe functies loopt via AERIUS-toets.',
      subsidie:      'Stimuleringsregeling VAB Brabant — check provincie.brabant.nl voor actuele openstellingen.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte is goed geregeld in Noord-Brabant. Sloopbonus varieert per gemeente: doorgaans 1 woning per 1.000 m² gesloopte stal.',
    nsw:            'Beperkte NSW-kansen in intensief agrarisch gebied. In de Groene Woud regio meer mogelijkheden.',
    recreatie:      'Goede toeristische markt (Brabantse Wal, Peel). Camperplaatsen en glamping kansrijk.',
    natuur:         'Veel Natura2000 (Kempen, Peel). ANLB actief. Transitie naar natuur vaak gecombineerd met stikstof-uitkoop.',
    lbv:            'Noord-Brabant heeft de meeste LBV-kansen van Nederland — dichtste veehouderij nabij Natura2000.',
    woningmarkt:    'Gespannen markt (Eindhoven-regio), elders gematigder. VAB-wonen sterk in dorpsranden.',
  },
  'Gelderland': {
    vab: {
      beleid:        'actief',
      toelichting:   'Gelderland heeft een van de meest uitgewerkte VAB-beleidsregimes. De Gelderse Ladder en het Kwalitatief Woonprogramma sturen op VAB-benutting. Gemeenten als Bronckhorst en Berkelland lopen voorop.',
      aandacht:      'Achterhoek heeft te maken met bevolkingskrimp — woningvraag lager dan in Veluwe-regio.',
      subsidie:      'Gelderfonds VAB-herbestemming (via Provincie Gelderland) — check actuele subsidieronde.',
    },
    roodVoorRood:   'Rood-voor-rood goed verankerd in Gelderse structuurvisie. Verhouding doorgaans 1 woning per 750–1.000 m².',
    nsw:            'Uitstekende NSW-kansen, met name op de Veluwe en in de Achterhoek. Provincie heeft eigen landgoedregeling bovenop NSW.',
    recreatie:      'Sterke toeristische markt (Veluwe, Gelderse Vallei). Vakantiewoningen en B&B kansrijk.',
    natuur:         'Veluwe en Achterhoek hebben veel NNN en Natura2000. ANLb sterk, SKNL actief.',
    lbv:            'Matige LBV-kansen — minder intensieve veehouderij dan Brabant.',
    woningmarkt:    'Veluwe: gespannen. Achterhoek: krimpgebied. Sterk locatieafhankelijk.',
  },
  'Overijssel': {
    vab: {
      beleid:        'actief',
      toelichting:   'Overijssel heeft actief erftransformatiebeleid via de Omgevingsvisie "Beken kleur". Gemeenten Twente en Salland werken met eigen VAB-regelingen.',
      aandacht:      'Twente heeft relatief veel leegstaande stallen — concurrentie op de markt, kwaliteit onderscheidend.',
      subsidie:      'Overijssels Fonds Leefomgeving voor pilotprojecten.',
    },
    roodVoorRood:   'Rood-voor-rood beschikbaar per gemeente, met name in Twente en Salland.',
    nsw:            'Goede NSW-kansen op de Sallandse Heuvelrug en langs de IJssel.',
    recreatie:      'Twente en Salland zijn populaire toeristische gebieden. Vakantiewoningen kansrijk.',
    natuur:         'Veen en heide (Natura2000). ANLb collectieven actief in Twente.',
    lbv:            'Matige LBV-kansen — enkele piekbelasters in Twente en Salland.',
    woningmarkt:    'Zwolle-regio gespannen, Twente gematigder. VAB-wonen kansrijk in dorpse kernen.',
  },
  'Utrecht': {
    vab: {
      beleid:        'beperkt actief',
      toelichting:   'Utrecht heeft een sterk verstedelijkte druk maar ook veel beschermd landelijk gebied (Groene Hart, Utrechtse Heuvelrug). VAB-beleid is strenger dan in oostelijke provincies.',
      aandacht:      'Welstand en cultuurhistorie wegen zwaar in het Groene Hart. Functiewijziging naar wonen kan lang duren.',
      subsidie:      'Geen specifieke provinciale VAB-subsidie — gemeentelijk beleid leidend.',
    },
    roodVoorRood:   'Beperkte ruimte-voor-ruimte in Utrecht, sterk afhankelijk van gemeente. Heuvelrug kansrijker dan Groene Hart.',
    nsw:            'Uitstekende NSW-kansen op de Utrechtse Heuvelrug. Hoge grondprijzen verhogen de financiële haalbaarheid.',
    recreatie:      'Sterke toeristische markt — Heuvelrug, Loosdrecht. Vakantieverhuur populair.',
    natuur:         'Natura2000 op Heuvelrug. ANLb actief in veenweidegebied.',
    lbv:            'Beperkte LBV-kansen — weinig intensieve veehouderij.',
    woningmarkt:    'Meest gespannen woningmarkt buiten Randstad — huurprijzen hoog, VAB-verhuur sterk rendabel.',
  },
  'Drenthe': {
    vab: {
      beleid:        'actief',
      toelichting:   'Drenthe heeft een uitgewerkt erven-beleid (Drentse ervenvisie). De provincie moedigt erftransformatie aan als kwaliteitsverbetering van het buitengebied.',
      aandacht:      'Bevolkingskrimp in sommige regio\'s (Zuidoost-Drenthe) — woningvraag beperkt.',
      subsidie:      'Drentse Ervencoach helpt kosteloos bij planvorming (provincie.drenthe.nl).',
    },
    roodVoorRood:   'Rood-voor-rood actief in Drenthe — verhouding circa 1 woning per 800 m².',
    nsw:            'Goede NSW-kansen op de Drentse Aa en rondom esdorpen.',
    recreatie:      'Drenthe is populair toeristische bestemming (hunebedden, natuur). Vakantiewoningen goed verhuurbaar.',
    natuur:         'Drents-Friese Wold, Drentse Aa (Natura2000). ANLb actief.',
    lbv:            'Matige LBV-kansen — veehouderij aanwezig maar minder intensief dan zuidelijke provincies.',
    woningmarkt:    'Ontspannen markt buiten Assen — lagere huurprijzen, maar ook lagere investeringsprijzen.',
  },
  'Friesland': {
    vab: {
      beleid:        'actief',
      toelichting:   'Friesland heeft "Romte foar romte" (ruimte voor ruimte) als beleidslijn. Erftransformatie wordt gestimuleerd als onderdeel van de Friese Omgevingsvisie.',
      aandacht:      'Markt voor woningverhuur kleiner dan in Randstad — toeristische verhuur (vakantiewoningen) doorgaans aantrekkelijker.',
      subsidie:      'Streekplannen per regio, vraag gemeente naar lokale regeling.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte beschikbaar in Friesland, uitvoering per gemeente.',
    nsw:            'NSW-kansen langs de Friese meren en in Laag-Holland uitlopers.',
    recreatie:      'Sterk toeristische markt (elfstedentocht-regio, meren). Vakantiewoningen en B&B kansrijk.',
    natuur:         'Waddenkust, Lauwersmeer (Natura2000). ANLb actief in veenweidegebied.',
    lbv:            'Matige LBV-kansen — melkveehouderij dominant, LBV richt zich meer op stikstofbijdragers.',
    woningmarkt:    'Ontspannen markt buiten Leeuwarden. Toeristische verhuur rendabeler dan langdurige huur.',
  },
  'Groningen': {
    vab: {
      beleid:        'actief',
      toelichting:   'Groningen combineert erftransformatie met aardbevingsversterking — herbouw of verbouw van stallen kan gecombineerd worden met versterkingsbudget in het aardbevingsgebied.',
      aandacht:      'Aardbevingsgebied (Oldambt, Loppersum): bouw- en vergunningstrajecten kunnen complex zijn door versterkingsprogramma.',
      subsidie:      'IMG (Instituut Mijnbouwschade Groningen) — check of locatie in versterkingsgebied ligt.',
    },
    roodVoorRood:   'Rood-voor-rood beschikbaar, minder actief dan in zuidelijke provincies.',
    nsw:            'Beperkte NSW-kansen — weinig landgoedtraditie in Groningen.',
    recreatie:      'Waddengebied en Groningen-stad — toerisme groeit maar markt kleiner.',
    natuur:         'Waddenzee (Natura2000), Dollard. ANLb actief in kleigebied.',
    lbv:            'Matige LBV-kansen — melkveehouderij dominant, weinig intensieve veehouderij.',
    woningmarkt:    'Krimpgebied buiten Groningen-stad — woningmarkt ontspannen.',
  },
  'Limburg': {
    vab: {
      beleid:        'actief',
      toelichting:   'Limburg werkt met het "Kwaliteitsmenu Limburg" — elke functiewijziging in het buitengebied vereist een kwaliteitsbijdrage aan het landschap. Dit betekent extra kosten maar ook duidelijkheid.',
      aandacht:      'Kwaliteitsverbetering (landschappelijke inpassing) is verplicht bij functiewijziging — budget reserveren.',
      subsidie:      'Limburgs Kwaliteitsfonds — bijdrage aan landschapsherstel deels subsidiebaar.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte via Kwaliteitsmenu Limburg — verplichte kwaliteitsbijdrage bij sloop en nieuwbouw.',
    nsw:            'Goede NSW-kansen in Zuid-Limburg (heuvelland) en Maasvallei.',
    recreatie:      'Zuid-Limburg is topbestemming — vakantiewoningen in heuvelland zeer kansrijk.',
    natuur:         'Natura2000 in Maasvallei en Zuid-Limburg. ANLb actief.',
    lbv:            'Matige LBV-kansen — gemengde landbouw in Noord-Limburg.',
    woningmarkt:    'Zuid-Limburg: gespannen (toeristische druk). Noord-Limburg: gematigder.',
  },
  'Zeeland': {
    vab: {
      beleid:        'beperkt actief',
      toelichting:   'Zeeland heeft een kleinere woningmarkt, maar sterke toeristische component. VAB voor vakantiewoningen kansrijker dan langdurige huur. Gemeenten werken per geval.',
      aandacht:      'Zeeuwse markt is klein — verhuurmarkt voor reguliere woningen beperkt. Focus op recreatieve verhuur.',
      subsidie:      'Geen specifieke VAB-subsidie provincie — gemeentelijk beleid leidend.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte beschikbaar, beperkt actief. Sloopbonus per gemeente.',
    nsw:            'NSW-kansen langs Zeeuwse kust en Walcheren.',
    recreatie:      'Zeeland is toeristische topbestemming — vakantiewoningen en B&B hebben sterk rendement.',
    natuur:         'Delta-natuur (Natura2000). ANLb actief in poldergebied.',
    lbv:            'Beperkte LBV-kansen — akkerbouw dominant in Zeeland.',
    woningmarkt:    'Kleine markt, hoge toeristische vraag — vakantieverhuur aantrekkelijker dan reguliere huur.',
  },
  'Flevoland': {
    vab: {
      beleid:        'beperkt actief',
      toelichting:   'Flevoland is een jonge polder-provincie met weinig historische erven en relatief planmatige inrichting. VAB-beleid bestaat maar is minder uitgewerkt dan in oudere provincies.',
      aandacht:      'Jonge grond (droogmakerij) — weinig cultuurhistorische complexiteit. Procedures doorgaans sneller.',
      subsidie:      'Flevolands Omgevingsfonds — vraag gemeente naar bijdrage bij erftransformatie.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte minder gangbaar in Flevoland — planmatige verkaveling bemoeilijkt sloopbonus-systematiek.',
    nsw:            'Beperkte NSW-kansen — jong landschap, weinig erfgoedwaarden.',
    recreatie:      'Randmeren, Oostvaardersplassen — recreatieve niche aanwezig maar kleiner dan kustprovincies.',
    natuur:         'Oostvaardersplassen (Natura2000) — natuur-transitie kansrijk nabij dit gebied.',
    lbv:            'Matige LBV-kansen — melkveehouderij en akkerbouw dominant.',
    woningmarkt:    'Almere-regio gespannen, rest ontspannen. VAB-wonen kansrijk in Lelystad-omgeving.',
  },
  'Zuid-Holland': {
    vab: {
      beleid:        'beperkt actief',
      toelichting:   'Zuid-Holland heeft de hoogste bevolkingsdichtheid van Nederland. VAB-kansen bestaan maar zijn zeer locatie-afhankelijk — Groene Hart heeft strikte regels, Hoeksche Waard soepeler.',
      aandacht:      'Groene Hart: functiewijziging naar wonen is politiek gevoelig en wordt streng getoetst. Buiten Groene Hart meer ruimte.',
      subsidie:      'Regionale woondeals en Groene Hart-programma\'s — vraag provincie naar actuele regeling.',
    },
    roodVoorRood:   'Ruimte-voor-ruimte in beperkte mate beschikbaar buiten Groene Hart.',
    nsw:            'NSW-kansen in Krimpenerwaard en Alblasserwaard (veen-landgoed).',
    recreatie:      'Groene Hart heeft toeristische potentie — fietsen, varen, poldertoerisme.',
    natuur:         'Natura2000 in kustzone en veenweide. ANLb actief.',
    lbv:            'Beperkte LBV-kansen — glastuinbouw en melkvee, minder intensieve veehouderij.',
    woningmarkt:    'Meest gespannen markt van Nederland (Rotterdam, Den Haag). VAB-verhuur financieel sterk.',
  },
}

/**
 * Geeft provinciespecifieke context terug voor een bepaald scenario-type.
 * Als de provincie onbekend is, valt terug op generieke tekst.
 */
function provincieCtx(provincie, type) {
  const data   = PROVINCIE_DATA[provincie]
  const generiek = {
    vab: {
      beleid:      'actief',
      toelichting: `${provincie ? provincie + ' heeft' : 'De meeste provincies hebben'} een VAB-beleid voor herbestemming van vrijkomende agrarische bebouwing. De uitwerking verschilt per gemeente.`,
      aandacht:    'Informeel vooroverleg met de gemeente is de eerste stap — toets het plan aan het lokale VAB-beleid.',
      subsidie:    'Vraag de gemeente naar provinciale of regionale subsidies voor erftransformatie.',
    },
    roodVoorRood:  'Ruimte-voor-ruimte is beschikbaar in de meeste provincies. De sloopbonus (m² per kavel) varieert per gemeente — vraag dit op bij de gemeente.',
    nsw:           'De Natuurschoonwet is landelijk geregeld. Provincies kunnen aanvullende landgoedregelingen hebben — vraag dit op bij de provincie.',
    recreatie:     'Recreatieve herbestemming is mogelijk bij agrarische bestemming — uitwerking is per gemeente en provincie verschillend.',
    natuur:        'ANLb en SKNL zijn landelijke regelingen, uitvoering via provinciale collectieven.',
    lbv:           'De Lbv-regeling is landelijk — kansen zijn hoger nabij Natura2000-gebieden.',
    woningmarkt:   'Woningvraag varieert sterk per regio — laat de lokale markt onderzoeken door een makelaar.',
  }
  if (!data) return { ...generiek, ...(type ? { [type]: generiek[type] } : {}) }
  return data
}

// ─── HOOFD FUNCTIE ────────────────────────────────────────────────────────────

export function genereerScenarios({ antwoorden, geoChecks, dsoData, totaalHectares, handmatigeInvoer, grond, bebouwing, locatie }) {

  // Invoer normaliseren
  const haEigendomRaw = grond?.hectaresEigendom || antwoorden.hectaresEigendom || ''
  const haPachtRaw    = grond?.hectaresPacht    || antwoorden.hectaresPacht    || ''
  const haEigendom    = parseFloat(haEigendomRaw) || (handmatigeInvoer?.hectares ? parseFloat(handmatigeInvoer.hectares) : totaalHectares) || 0
  const ha            = haEigendom + (parseFloat(haPachtRaw) || 0)
  const provincie     = locatie?.provincie || antwoorden.provincie || ''
  const gemeente      = locatie?.gemeente  || ''

  // Provinciespecifieke context — gebruikt in alle scenario-teksten
  const pCtx = provincieCtx(provincie)

  const beb = bebouwing || {}
  const m2Stal           = beb.stal?.aanwezig           ? (parseFloat(beb.stal.m2)           || 0) : 0
  const m2Schuur         = beb.schuur?.aanwezig         ? (parseFloat(beb.schuur.m2)         || 0) : 0
  const m2Kassen         = beb.kassen?.aanwezig         ? (parseFloat(beb.kassen.m2)         || 0) : 0
  const m2Overig         = beb.overig?.aanwezig         ? (parseFloat(beb.overig.m2)         || 0) : 0
  const m2Bedrijfswoning = beb.bedrijfswoning?.aanwezig ? (parseFloat(beb.bedrijfswoning.m2) || 0) : 0
  const m2Woonhuis       = beb.woonhuis?.aanwezig       ? (parseFloat(beb.woonhuis.m2)       || 0) : 0
  const m2AgrarischTotaal = m2Stal + m2Schuur + m2Kassen + m2Overig + m2Bedrijfswoning
  const m2DakTotaal       = m2AgrarischTotaal + m2Woonhuis

  const heeftBebouwing = beb.heeftGebouwen !== false && (m2AgrarischTotaal > 0 || beb.heeftGebouwen === true)

  const a   = antwoorden
  const geo = geoChecks
  const dso = dsoData || {}

  const nabijN2000     = geo.natura2000?.aanwezig || a.nabijNatura2000 === 'ja'
  const inNNN          = geo.nnn?.aanwezig || false
  const dsoGeschermd   = dso.isGeschermdeGebied === true
  const dsoKanWonen    = dso.kanFunctiewijzigingWonen !== false
  const dsoKanRecreatie= dso.kanRecreatie !== false

  const isVeehouderij  = ['veehouderij', 'gemengd'].includes(a.bedrijfstype)
  const wiltVerkopen   = a.wensen.includes('verkopen') || a.wensen.includes('deels_verkopen')
  const wiltVerpachten = a.wensen.includes('verpachten')
  const wiltFunctie    = a.wensen.includes('functiewijziging')
  const wiltLandgoed   = a.wensen.includes('landgoed')
  const wiltEnergie    = a.wensen.includes('energie')
  const korteHorizon   = ['1jaar', '1-3jaar'].includes(a.tijdshorizon)
  const maxOpbrengst   = a.financieelDoel === 'maximale_opbrengst'
  const rustZekerheid  = a.financieelDoel === 'rust_zekerheid' || a.financieelDoel === 'volgende_generatie'
  const beperktGebied  = inNNN || dsoGeschermd

  const fw             = a.functieWensen || []
  const staat          = a.bouwkundigeStaat || 'matig'
  const asbest         = a.asbestAanwezig  || 'weet_niet'
  const rolActief      = a.rolNaTransitie  !== 'passief'
  const eigenVermogen  = a.eigenVermogen   || ''

  // ── Nieuwe geo-flags (uit nieuwe services) ──────────────────────────────
  const stikstofKritisch      = geo.stikstof?.kritischGebied        || false
  const stikstofOverbelast    = geo.stikstof?.overbelast             || false
  const bodemAlert            = geo.bodem?.saneringAlert             || false
  const heeftMonument         = geo.monument?.aanwezig               || false
  const inBeschermdeGezicht   = geo.beschermdGezicht?.aanwezig       || false
  const cultuurhistorischWrd  = geo.cultuurhistorie?.aanwezig        || false
  const netcongestieVol       = geo.netcongestie?.status === 'vol'
  const netcongEstieDruk      = geo.netcongestie?.status === 'druk'
  const cbsBevolking          = geo.cbs?.bevolking   || null
  const cbsWoningdruk         = geo.cbs?.woningdruk  || null
  const cbsWoz                = geo.cbs?.woz         || null
  const bevolkingskrimp       = cbsBevolking?.trend === 'krimp'
  const bevolkingsgroei       = cbsBevolking?.trend === 'groei'
  const woningdrukHoog        = cbsWoningdruk?.trend === 'hoog'
  const wozHoog               = cbsWoz?.niveau === 'hoog'
  const netbeheerder          = geo.netcongestie?.netbeheerder || ''

  // Gecombineerde beperkingsvlag (uitgebreid met monument + beschermd gezicht)
  const erfgoedBeperkt        = heeftMonument || inBeschermdeGezicht
  const omgevingsBeperkt      = beperktGebied || erfgoedBeperkt

  const scenarios = []

  // ── 1. LBV / BEËINDIGINGSREGELING ──────────────────────────────────────────
  if (isVeehouderij) {
    const haalb = nabijN2000 ? 'hoog' : 'gemiddeld'
    scenarios.push({
      id: 'lbv',
      naam: 'Beëindigingsregeling (Lbv)',
      haalbaarheid: haalb,
      icoon: '🏛️',
      kengetallen: kengetallenLbv({ nabijN2000 }),
      samenvatting: nabijN2000
        ? `Uw bedrijf ligt nabij een Natura 2000-gebied${gemeente ? ' bij ' + gemeente : ''}. U komt waarschijnlijk in aanmerking voor de beëindigingsregeling. ${pCtx.lbv} Dit kan een substantiële uitkoopvergoeding opleveren.`
        : `Als veehouderijbedrijf in ${provincie || 'uw provincie'} kunt u mogelijk in aanmerking komen voor de beëindigingsregeling. ${pCtx.lbv} Een nieuwe brede regeling is in voorbereiding.`,
      kansen: [
        'Geen investering vereist — uitkoop door overheid',
        nabijN2000 ? 'Hoge kans op regeling vanwege Natura 2000-ligging nabij uw locatie' : 'Nieuwe brede regeling (budget €1,25–2,5 mrd) in voorbereiding',
        'Duidelijkheid en afronding — rust na jaren van onzekerheid',
      ],
      pijnpunten: [
        'Definitieve bedrijfsbeëindiging op de locatie verplicht',
        'Gebouwen worden gesloopt — geen herbestemming mogelijk',
        'Regelingen zijn tijdelijk en budgetgebonden',
        'Stakingswinst is belastbaar — fiscale planning vereist',
      ],
      duurzaamheid: {
        beschrijving: 'Sloop van stallen biedt kansen voor landschapsverbetering en stikstofruimte voor omgeving.',
        subsidies: 'Sloopsubsidie provincie mogelijk. Check Subsidieregeling Sanering Varkenshouderijen (SVV) als van toepassing.',
        onderhoudslast: 'Geen — na sloop geen onderhoud',
      },
      relevanteRegelingen: ['Lbv (Landelijke beëindigingsregeling veehouderij)', 'Lbv-plus voor piekbelasters', 'Nieuwe brede beëindigingsregeling (verwacht)'],
      vervolgstap: 'Vraag uw accountant om een eerste berekening van de stakingswinst. Meld u oriënterend bij RVO.nl.',
      aandachtspunten: [
        'Deelname vereist definitieve bedrijfsbeëindiging op de locatie',
        'Opengestelde regelingen zijn altijd tijdelijk en budgetgebonden',
        a.heeftFOR === 'ja' ? '⚠️ FOR valt vrij bij staking — bespreek omzetting naar lijfrente' : '',
      ].filter(Boolean),
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['lbv'] }),
    })
  }

  // ── 1b. HOBBYDIEREN HOUDEN ──────────────────────────────────────────────────
  if (isVeehouderij && (a.wiltHobbydieren === 'ja' || a.wiltHobbydieren === '')) {
    scenarios.push({
      id: 'hobbydieren',
      naam: 'Hobbydieren houden',
      haalbaarheid: 'hoog',
      icoon: '🐓',
      kengetallen: {
        investering:  'Nihil – laag',
        inkomsten:    'Geen (hobby)',
        inkomstenType:'Levensstijl',
        doorlooptijd: 'Direct mogelijk',
        risico:       'Laag',
        kennis:       'Laag',
      },
      samenvatting: `Na het stoppen met uw veehouderijbedrijf${gemeente ? ' bij ' + gemeente : ''} mag u in de meeste gevallen hobbymatig dieren blijven houden. Na deelname aan de Lbv of Lbv-plus zijn landbouwhuisdieren voor commercieel gebruik niet meer toegestaan — hobbymatig houden is wel mogelijk, maar de definitie van 'hobbymatig' verschilt per gemeente.`,
      kansen: [
        'Geen investering nodig — u houdt wat u heeft, op kleinere schaal',
        'Persoonlijke verbondenheid met het erf en de dieren blijft behouden',
        'Combineerbaar met andere functies zoals zorgboerderij, recreatie of agrifood',
        'Aanpassing omgevingsplan biedt kans om hobbyruimte formeel te borgen',
      ],
      pijnpunten: [
        'Definitie "hobbymatig" is niet wettelijk vastgelegd — gemeente beslist',
        'Na Lbv/Lbv-plus: géén commercieel gehouden landbouwhuisdieren meer op de locatie',
        'Omgevingsplan moet worden aangepast — dit vergt een procedure',
        'Aantal en soort dieren bepaalt of het als hobby of bedrijf wordt gezien',
      ],
      duurzaamheid: {
        beschrijving: 'Kleine dierhouderij past goed bij een multifunctionele erfbestemming. Denk aan kippen voor eieren, schapen voor graasbeheer of paarden voor gebruik.',
        subsidies: 'Geen subsidies voor hobbymatige houderij.',
        onderhoudslast: 'Laag — afhankelijk van aantal en soort dieren.',
      },
      relevanteRegelingen: ['Lbv / Lbv-plus (na deelname: geen commercieel vee)', 'Omgevingsplan gemeente (aanpassen via maatwerk)', 'Wet dieren (registratie- en identificatieplicht)'],
      vervolgstap: `Vraag uw gemeente expliciet wat onder "hobbymatig" verstaan wordt en laat de omgevingsplanwijziging meenemen in het bredere transactieproces. Zo borgt u uw ruimte voor later.`,
      aandachtspunten: [
        'Bespreek hobbymatig houden altijd expliciet bij de Lbv-beschikking',
        'Combineer omgevingsplanwijziging met uw VAB- of bestemmingstraject',
        'Meld- en identificatieplicht (I&R) blijft gelden ook voor hobbydieren',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['lbv'] }),
    })
  }

  // ── 2. VAB WONINGBOUW ───────────────────────────────────────────────────────
  if (heeftBebouwing && m2AgrarischTotaal >= 200 && (wiltFunctie || fw.includes('wonen') || !wiltVerkopen && !wiltVerpachten)) {
    const haalb = beperktGebied ? 'laag' : (dsoKanWonen && m2AgrarischTotaal >= 500 ? 'hoog' : 'gemiddeld')
    scenarios.push({
      id: 'vab_wonen',
      naam: 'VAB Woningbouw',
      haalbaarheid: haalb,
      icoon: '🏠',
      kengetallen: kengetallenVabWonen({ m2: m2AgrarischTotaal, staat, asbest }),
      samenvatting: `Via het VAB-beleid (Vrijkomende Agrarische Bebouwing) kunt u uw ${m2AgrarischTotaal > 0 ? m2AgrarischTotaal + ' m²' : ''} agrarische bebouwing bij ${gemeente || provincie} ombouwen naar huur- of koopwoningen. ${pCtx.vab.toelichting}`,
      kansen: [
        pCtx.woningmarkt,
        'Gunstig beleidsklimaat — nationale woningbouwopgave van 900.000 woningen tot 2030',
        'Karakteristieke stallen hebben hoge architectonische waarde',
        'Verhuur geeft stabiel maandelijks inkomen',
        m2AgrarischTotaal >= 1000 ? `${Math.floor(m2AgrarischTotaal / 110)} woningen mogelijk op basis van uw ${m2AgrarischTotaal} m²` : '',
      ].filter(Boolean),
      pijnpunten: [
        'Lange doorlooptijd (3–5 jaar) — eerste inkomsten pas over 3–4 jaar',
        'Reguliere hypotheek niet altijd mogelijk — gespecialiseerde financier nodig',
        beperktGebied ? '⚠️ Ligging in beschermd gebied — extra toetsing vereist' : '',
        asbest === 'ja' ? '⚠️ Asbest aanwezig — saneringskosten €20–50/m² extra' : '',
        pCtx.vab.aandacht,
        'Woonbestemming is onomkeerbaar — agrarische functie vervalt',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: `Verbouw naar BENG-norm (bijna energieneutraal) is vereist bij nieuwe woningen. Met uw dakoppervlak (±${Math.round(m2DakTotaal * 0.6)} m² bruikbaar) zijn ±${Math.round(m2DakTotaal * 0.6 / 7)} kWp zonnepanelen installeerbaar.`,
        subsidies: `${pCtx.vab.subsidie} ISDE (isolatie) en investeringssubsidie duurzame energie zijn ook van toepassing.`,
        onderhoudslast: 'Verhuur = actieve beheersrol (±8 uur/mnd per 4 woningen). Overweeg een verhuurbeheerder.',
      },
      relevanteRegelingen: [
        `VAB-beleid ${provincie || 'provincie'} (${pCtx.vab.beleid})`,
        'Ruimte-voor-ruimte / rood-voor-rood (bij sloop)',
        ...(dsoKanWonen ? ['✓ Omgevingsplan: woonfunctie lijkt haalbaar op deze locatie'] : []),
      ],
      groenvooRoodTip: true,
      vervolgstap: `Informeel vooroverleg gemeente ${gemeente || '(uw gemeente)'} — toets de schaal aan het VAB-beleid en vraag of een postzegelbestemmingsplan mogelijk is.`,
      aandachtspunten: [
        `Agrarische bebouwing: ${m2AgrarischTotaal} m² in ${gemeente || provincie} — provinciaal plafond is veelal 2–4 wooneenheden`,
        'Bodemonderzoek verplicht bij functiewijziging naar wonen',
        'Ecologisch onderzoek vereist bij verbouw (flora/fauna)',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['vab_wonen', 'functiewijziging'] }),
    })
  }

  // ── 3. ROOD-VOOR-ROOD ───────────────────────────────────────────────────────
  if (m2AgrarischTotaal >= 500) {
    const haalb = beperktGebied ? 'laag' : (m2AgrarischTotaal >= 1000 ? 'hoog' : 'gemiddeld')
    scenarios.push({
      id: 'rood_voor_rood',
      naam: 'Rood-voor-rood',
      haalbaarheid: haalb,
      icoon: '🏗️',
      kengetallen: kengetallenRoodVoorRood({ m2: m2AgrarischTotaal, staat, asbest, provincie }),
      samenvatting: `Met ${m2AgrarischTotaal.toLocaleString('nl-NL')} m² agrarische bebouwing bij ${gemeente || provincie} kunt u via de rood-voor-rood regeling één of meer bouwkavels verdienen in ruil voor sloop. ${pCtx.roodVoorRood}`,
      kansen: [
        `${Math.max(1, Math.floor(m2AgrarischTotaal / 800))} bouwkavel${Math.floor(m2AgrarischTotaal / 800) > 1 ? 's' : ''} mogelijk op basis van uw ${m2AgrarischTotaal} m² sloopvolume`,
        'Relatief korte doorlooptijd vs. verbouwtraject',
        'Landschapsverbetering — sloop versterkt draagvlak bij gemeente',
        wozHoog ? `Hoge WOZ-waarden in ${gemeente || provincie} — kavelbijdrage gunstig` : 'Kavelbijdrage direct realiseerbaar via kavelverkoop',
      ],
      pijnpunten: [
        'Sloop is onomkeerbaar — gebouwen verdwijnen definitief',
        asbest === 'ja' ? '⚠️ Asbestsanering verplicht vóór sloop — extra kosten' : 'Asbest controleren vóór sloop',
        beperktGebied ? '⚠️ Beschermd gebied — rood-voor-rood is hier moeilijker' : '',
        'Nieuwe woning mag alleen op voormalig agrarisch bouwvlak',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Nieuwe woning bouwen naar BENG-standaard (bijna energieneutraal) is wettelijk verplicht. Combineer met warmtepomp en zonnepanelen.',
        subsidies: 'ISDE voor nieuwe woninginstallaties. Mogelijke sloopsubsidie provincie.',
        onderhoudslast: 'Nieuwe woning: laag onderhoud eerste 10 jaar.',
      },
      relevanteRegelingen: [
        `Rood-voor-rood beleid provincie ${provincie || '(uw provincie)'}`,
        'Ruimte-voor-ruimte (sommige provincies)',
      ],
      groenvooRoodTip: true,
      vervolgstap: `Vraag bij de gemeente ${gemeente || '(uw gemeente)'} naar de sloopbonus per m² en de maximale schaal. Laat een ruimtelijk adviseur de haalbaarheid toetsen.`,
      aandachtspunten: [
        `${m2AgrarischTotaal} m² gesloopt → recht op ±${Math.max(1, Math.floor(m2AgrarischTotaal / 800))} bouwkavel(s)`,
        'Sloopvergunning nodig voor gebouwen > 10 m²',
        'Woonhuis telt NIET mee voor sloopbonus',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['rood_voor_rood'] }),
    })
  }

  // ── 4. NSW LANDGOED ─────────────────────────────────────────────────────────
  if (haEigendom >= 5 && (wiltLandgoed || haEigendom >= 10)) {
    const haalb = haEigendom >= 10 && wiltLandgoed ? 'hoog' : 'gemiddeld'
    scenarios.push({
      id: 'nsw',
      naam: 'NSW Landgoed',
      haalbaarheid: haalb,
      icoon: '🌳',
      kengetallen: kengetallenNSW({ ha: haEigendom }),
      samenvatting: `Met ${haEigendom} ha eigendom bij ${gemeente || provincie} kunt u een nieuw landgoed vormen onder de Natuurschoonwet (NSW). ${pCtx.nsw} Dit geeft fiscale vrijstellingen én de mogelijkheid om een woonhuis (landhuis) te bouwen. Minimaal 30% moet natuur of park worden.`,
      kansen: [
        'NSW-rangschikking: vrijstelling OZB en box 3 vermogensbelasting',
        a.heeftOpvolger === 'ja' ? 'BOR-koppeling: overdracht aan kinderen grotendeels belastingvrij' : '',
        'Woonhuis/landhuis op het landgoed is toegestaan',
        inNNN ? 'Ligging in NNN biedt extra subsidiekansen (SKNL, ANLb)' : '',
        cultuurhistorischWrd ? 'Cultuurhistorische waarden aanwezig — versterkt NSW-rangschikking' : 'Landgoedwaarde stijgt bij goede inrichting en NSW-rangschikking',
      ].filter(Boolean),
      pijnpunten: [
        'Openstellingsplicht voor publiek is voorwaarde voor volledige vrijstelling',
        'Langjarige verplichting — moeilijk terug te draaien',
        'Hoge inrichtingskosten bij natte of intensief bewerkte percelen',
        'Beheersplan en provinciale goedkeuring vereist',
      ],
      duurzaamheid: {
        beschrijving: 'Landgoed combineert natuur, biodiversiteit en koolstofvastlegging. SKNL-subsidie voor kwaliteitsverbetering natuur.',
        subsidies: 'SKNL (Subsidie Kwaliteitsimpuls Natuur en Landschap), ANLb, provinciale landgoedregelingen.',
        onderhoudslast: 'Hoog — bosbeheer, onderhoud watergangen, beheersplan opstellen en uitvoeren.',
      },
      relevanteRegelingen: ['Natuurschoonwet (NSW)', `Provinciale landgoedregeling ${provincie}`, 'SKNL — Subsidie Kwaliteitsimpuls Natuur en Landschap'],
      vervolgstap: `Vraag een rentmeester om een NSW-haalbaarheidscheck voor uw locatie bij ${gemeente || provincie}. Controleer de provinciale landgoedregeling ${provincie} voor extra mogelijkheden (bijv. extra bouwrecht).`,
      aandachtspunten: [
        'Minimaal 5 ha, waarvan minimaal 30% natuur/park',
        'Woongebouw (landhuis) toegestaan — verhoogt waarde significant',
        'Onderhoud is langdurige verplichting',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['nsw'] }),
    })
  }

  // ── 5. ZORGBOERDERIJ ────────────────────────────────────────────────────────
  if ((wiltFunctie || fw.includes('zorg')) && heeftBebouwing && rolActief) {
    scenarios.push({
      id: 'zorgboerderij',
      naam: 'Zorgboerderij',
      haalbaarheid: 'gemiddeld',
      icoon: '🌿',
      kengetallen: kengetallenZorgboerderij({ m2: Math.max(m2AgrarischTotaal, 200), staat, asbest }),
      samenvatting: `Een zorgboerderij biedt dagbesteding, begeleiding of therapeutisch verblijf aan mensen met een zorgvraag. De vraag groeit — gemeenten kopen zorgplekken in via WMO-contracten. U combineert agrarische omgeving met een maatschappelijke functie.`,
      kansen: [
        'Groeiende vraag naar WMO-gefinancierde dagbesteding',
        'Agrarische omgeving heeft aantoonbaar therapeutische waarde',
        'Maatschappelijke meerwaarde versterkt draagvlak bij gemeente',
        'Combinatie met agrarische nevenactiviteit mogelijk',
      ],
      pijnpunten: [
        'WMO-contract met gemeente is noodzakelijk — aanbesteding kan lang duren',
        'Hoge eisen aan gebouwen (brandveiligheid, toegankelijkheid)',
        'Arbeidsintensief — professionele begeleiding vereist',
        'Seizoensgebonden activiteiten passen minder goed bij vaste zorgcontracten',
      ],
      duurzaamheid: {
        beschrijving: 'Zorgboerderijen dragen bij aan sociale cohesie en duurzame zorgverlening. Combineer met biologische teelt voor extra meerwaarde.',
        subsidies: 'WMO-financiering via gemeente. Investeringssubsidie toegankelijkheid (SVB-financiering). LEADER-subsidie in sommige regio\'s.',
        onderhoudslast: 'Hoog — dagelijkse begeleiding, administratie, WMO-verantwoording.',
      },
      relevanteRegelingen: ['WMO-dagbesteding (via gemeente)', 'Omgevingsvergunning maatschappelijke functie', `VAB-beleid ${provincie || '(uw provincie)'}`],
      vervolgstap: 'Neem contact op met de gemeente over WMO-inkoop voor dagbesteding. Laat een zorgconsultant de haalbaarheid beoordelen.',
      aandachtspunten: [
        'Bestemmingswijziging naar maatschappelijk kan noodzakelijk zijn',
        'GGD-eisen aan gebouwen (vluchtroutes, sanitair)',
        'Geen vast inkomen zonder WMO-contract — start met oriëntatie bij gemeente',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['zorgboerderij', 'functiewijziging'] }),
    })
  }

  // ── 6. RECREATIE & CAMPING ──────────────────────────────────────────────────
  if ((wiltFunctie || fw.includes('recreatie') || fw.includes('vakantie')) && heeftBebouwing) {
    const isVakantieWoning = fw.includes('vakantie')
    const id = isVakantieWoning ? 'vakantiewoningen' : 'recreatie'
    const naam = isVakantieWoning ? 'Vakantiewoningen / B&B' : 'Recreatie & Camping'
    scenarios.push({
      id,
      naam,
      haalbaarheid: beperktGebied ? 'laag' : (dsoKanRecreatie ? 'hoog' : 'gemiddeld'),
      icoon: isVakantieWoning ? '🏕️' : '⛺',
      kengetallen: isVakantieWoning
        ? kengetallenVakantiewoningen({ m2: m2AgrarischTotaal, staat, asbest })
        : kengetallenRecreatie({ m2: m2AgrarischTotaal, staat, asbest }),
      samenvatting: isVakantieWoning
        ? `Verbouw van agrarische schuren bij ${gemeente || provincie} naar vakantiewoningen of een B&B. ${pCtx.recreatie} Lage drempel, hoge waardering bij gasten.`
        : `Camping, glamping of agro-toerisme op uw erf bij ${gemeente || provincie}. ${pCtx.recreatie} U behoudt de agrarische sfeer die gasten aanspreekt.`,
      kansen: [
        'Toerisme in het buitengebied groeit — sterke vraag',
        'Lage regeldruk vergeleken met woningbouw',
        isVakantieWoning ? 'B&B / kleinschalige verhuur: vergunning veelal eenvoudiger' : 'Camping: sneller opstartbaar, lagere investering',
        'Combinatie met agrarisch bedrijf of streekproducten versterkt concept',
      ],
      pijnpunten: [
        'Seizoensgebonden — inkomsten niet jaarrond stabiel',
        'Actieve beheersrol vereist (schoonmaak, gastontvangst)',
        beperktGebied ? '⚠️ Beschermd gebied — recreatieve functie extra getoetst' : '',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Duurzame recreatie scoort steeds beter bij gasten. Zonnepanelen, wateropvang en lokale producten zijn sterke combinaties.',
        subsidies: 'LEADER-subsidie in sommige regio\'s voor agro-toerisme. Duurzaamheidsinvesteringen via ISDE.',
        onderhoudslast: 'Gemiddeld — seizoensmatig intensief, overwinteringsonderhoud aan infrastructuur.',
      },
      relevanteRegelingen: ['Recreatieve bestemming omgevingsplan', `VAB-beleid ${provincie || '(uw provincie)'}`, 'Toeristenbelasting gemeente'],
      groenvooRoodTip: true,
      vervolgstap: 'Check het bestemmingsplan op recreatieve activiteiten. Vraag de gemeente naar een kleinschalige recreatievergunning.',
      aandachtspunten: [
        'Brandveiligheidseisen voor slaapgelegenheid (BBL)',
        'Meldingsplicht voor B&B boven bepaalde omvang',
        'Parkeeroplossing op eigen terrein vereist',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: [id, 'functiewijziging'] }),
    })
  }

  // ── 7. ZONNEPANELEN ─────────────────────────────────────────────────────────
  if ((wiltEnergie || a.wensen.includes('energie')) && m2DakTotaal >= 200) {
    scenarios.push({
      id: 'zonnepanelen',
      naam: 'Zonnepanelen (dak)',
      haalbaarheid: 'hoog',
      icoon: '☀️',
      kengetallen: kengetallenZonnepanelen({ m2Dak: m2DakTotaal, staat }),
      samenvatting: `Met ±${Math.round(m2DakTotaal * 0.6)} m² bruikbaar dakoppervlak kunt u ±${Math.round(m2DakTotaal * 0.6 / 7)} kWp installeren. Bij SDE++-subsidie of saldering levert dit stabiel jaarinkomen op — met lage onderhoudsdrempel.`,
      kansen: [
        'Snelste weg naar inkomen — vergunningsvrij tot bepaalde omvang',
        'SDE++-subsidie geeft 15 jaar vaste terugleverprijs',
        `Dak beschikbaar: ±${Math.round(m2DakTotaal * 0.6)} m² → ±${Math.round(m2DakTotaal * 0.6 / 7)} kWp installeerbaar`,
        'Gecombineerd met andere functies (verhuur, exploitatie)',
      ],
      pijnpunten: [
        asbest === 'ja' ? '⚠️ Asbest op het dak moet eerst gesaneerd worden' : '',
        staat === 'slecht' ? '⚠️ Dakconstructie mogelijk niet sterk genoeg — eerste onderzoek nodig' : '',
        'SDE++ aanvraag kost tijd — tender tweemaal per jaar',
        'Netcongestie in sommige regio\'s — check bij Netbeheer NL',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Zonnepanelen zijn de meest directe verduurzamingsstap. Combineer met opslag (batterij) voor maximale eigen verbruik.',
        subsidies: 'SDE++ (15 jaar vaste subsidie), ISDE voor kleine installaties, salderingsregeling (loopt af — check actuele regeling).',
        onderhoudslast: 'Laag — panelen reinigen 1x/jr, omvormer check 5-jaarlijks.',
      },
      relevanteRegelingen: ['SDE++ (RVO)', 'Salderingsregeling (Belastingdienst)', 'Vergunningsvrij tot 2,5m hoogte bij bestaand dak'],
      vervolgstap: 'Vraag een zonne-energie installateur om een dakscan. Check SDE++-tender data op RVO.nl.',
      aandachtspunten: [
        'Check netcongestie bij uw netbeheerder vóór grote installatie',
        asbest === 'ja' ? 'Asbest saneren vóór plaatsing panelen' : '',
        'Eigenaar dak én panelen moet duidelijk zijn voor verzekering',
      ].filter(Boolean),
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['zonnepanelen'] }),
    })
  }

  // ── 8. BEDRIJFSRUIMTE VERHUUR ───────────────────────────────────────────────
  if ((wiltFunctie || fw.includes('bedrijfsruimte')) && m2AgrarischTotaal >= 300 && !rolActief === false) {
    scenarios.push({
      id: 'bedrijfsruimte',
      naam: 'Bedrijfsruimte verhuur',
      haalbaarheid: 'gemiddeld',
      icoon: '🏭',
      kengetallen: kengetallenBedrijfsruimte({ m2: m2AgrarischTotaal, staat, asbest }),
      samenvatting: `Verhuur van stallen of loodsen als opslag of werkruimte. Laagste investeringsdrempel van alle herbestemmingen — in veel gevallen volstaat een minimale verbouwing. Stabiel passief inkomen.`,
      kansen: [
        'Laagste investeringsdrempel — soms al verhuurbaar met kleine aanpassingen',
        'Passief inkomen — geen dagelijkse betrokkenheid nodig',
        'Hoge vraag naar betaalbare bedrijfsruimte in landelijke gebieden',
        'Bestemmingswijziging vaak minder complex dan woonfunctie',
      ],
      pijnpunten: [
        'Lagere m²-prijs dan woningverhuur',
        'Bestemmingsplan moet bedrijfsactiviteiten toestaan',
        asbest === 'ja' ? '⚠️ Asbest saneren bij verhuur aan derden verplicht (Arbo-wetgeving)' : '',
        'Milieuzonering — niet alle bedrijfstypes toegestaan nabij woningen',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Combineer met zonnepanelen op het dak van de verhuurde ruimte. Huurder kan ook eigen zonnepanelen plaatsen.',
        subsidies: 'Geen specifieke subsidie. Dakpanelen via SDE++ wel mogelijk.',
        onderhoudslast: 'Laag — verantwoordelijkheid deels bij huurder. Regulier gebouwonderhoud.',
      },
      relevanteRegelingen: ['Bedrijfsbestemming omgevingsplan', `VAB-beleid ${provincie || '(uw provincie)'}`, 'Omgevingsvergunning milieu (afhankelijk van type huurder)'],
      vervolgstap: 'Check of het huidige bestemmingsplan bedrijvigheid toestaat. Vraag een makelaar naar de markthuurprijs in uw regio.',
      aandachtspunten: [
        'Brandveiligheidseisen voor bedrijfsruimte (NEN 6090)',
        'Arbo-eisen bij verhuur als werkruimte',
        'Omgevingsvergunning mogelijk nodig bij milieucategorie huurder',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['bedrijfsruimte', 'functiewijziging'] }),
    })
  }

  // ── 9. NATUUR & VOEDSELBOS ──────────────────────────────────────────────────
  if ((wiltFunctie || fw.includes('natuur') || wiltLandgoed) && haEigendom >= 2) {
    scenarios.push({
      id: 'natuur',
      naam: 'Natuur & Voedselbos',
      haalbaarheid: haEigendom >= 5 ? 'gemiddeld' : 'laag',
      icoon: '🌱',
      kengetallen: kengetallenNatuur({ ha: haEigendom }),
      samenvatting: `Omvorming van ${haEigendom} ha landbouwgrond bij ${gemeente || provincie} naar natuur, voedselbos of agroforestry. ${pCtx.natuur} Een voedselbos kan na 5–10 jaar directe oogstopbrengsten geven.`,
      kansen: [
        'ANLb/SNL subsidie dekt deel van inkomensverlies',
        'Voedselbos geeft directe oogstproducten na 5–10 jaar',
        inNNN ? `Ligging in NNN bij ${gemeente || provincie} geeft hogere subsidiekansen (SKNL)` : '',
        'Maatschappelijke waardering en positieve media-aandacht',
        'Combineerbaar met educatieve activiteiten of rondleidingen',
      ].filter(Boolean),
      pijnpunten: [
        'Langetermijninvestering — eerste significante opbrengst na jaren',
        'ANLb-subsidie is concurrentieel — niet gegarandeerd',
        'Agrarische bestemming vervalt — lastig terug te draaien',
        'Markt voor voedselbosproducten is nog beperkt in Nederland',
      ],
      duurzaamheid: {
        beschrijving: 'Maximale duurzaamheidswaarde — koolstofvastlegging, biodiversiteit en waterberging in één. Aantrekkelijk voor carbon credits.',
        subsidies: 'ANLb (Agrarisch Natuur- en Landschapsbeheer), SKNL, Subsidie Landschapsherstel, provinciale groenfondsen.',
        onderhoudslast: 'Gemiddeld — voedselbos heeft 3–5 jaar intensieve aanleg en begeleiding nodig.',
      },
      relevanteRegelingen: ['ANLb (collectief)', 'SNL (Subsidie Natuur en Landschap)', 'SKNL', `Provinciaal Natuur Netwerk (${provincie || 'uw provincie'})`],
      vervolgstap: 'Neem contact op met het ANLb-collectief in uw regio. Vraag een ecologisch adviseur naar de potentie van uw grond.',
      aandachtspunten: [
        'ANLb werkt via collectieven — individuele aanmelding niet altijd mogelijk',
        'Controleer of grond niet is verpacht (pacht blokkeert functiewijziging)',
        'Voedselbos vereist geduldige, langetermijn-aanpak',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['natuur'] }),
    })
  }

  // ── 10. AGRIFOOD / STREEKPRODUCTEN ──────────────────────────────────────────
  if ((fw.includes('agrifood') || (a.bedrijfstype === 'akkerbouw' || a.bedrijfstype === 'tuinbouw')) && rolActief) {
    scenarios.push({
      id: 'agrifood',
      naam: 'Agrifood / Streekproducten',
      haalbaarheid: 'gemiddeld',
      icoon: '🛒',
      kengetallen: kengetallenAgrifood({ m2: m2AgrarischTotaal, staat, asbest }),
      samenvatting: `Verkoop van streekproducten, een boerderijwinkel, pluktuin of abonnementen (CSA). Lage investeringsdrempel en direct klantcontact. Werkt het beste in combinatie met een bestaand bedrijf of recreatie.`,
      kansen: [
        'Groeiende vraag naar lokaal en eerlijk voedsel',
        'Directe marge — geen tussenhandel',
        'Combineerbaar met recreatie, zorgboerderij of kinderopvang',
        'Vergunningsdrempel laag voor kleinschalige nevenactiviteit',
      ],
      pijnpunten: [
        'Arbeidsintensief — marketing, klantbeheer, logistiek',
        'Schaalvoordeel ontbreekt vs. supermarkt',
        'Inkomensonzeker — afhankelijk van klantenbinding',
      ],
      duurzaamheid: {
        beschrijving: 'Kortere voedselketen = lagere CO2-uitstoot, meer biodiversiteit. Biologisch certificaat versterkt positie en subsidiekansen.',
        subsidies: 'POP3-subsidie voor korte ketens, provinciale regelingen lokale voedselketens.',
        onderhoudslast: 'Hoog — dagelijkse betrokkenheid bij productie, verkoop en klantcontact.',
      },
      relevanteRegelingen: ['Nevenactiviteit agrarisch bedrijf', 'Kleinschalige horeca-ontheffing (bij terras)', 'POP3 korte ketens'],
      vervolgstap: 'Onderzoek de afzetmarkt in uw regio. Begin klein (boerderijpakket) en schaal op basis van vraag.',
      aandachtspunten: [
        'Bestemmingsplan moet nevenactiviteiten toestaan',
        'NVWA-registratie nodig bij verkoop van levensmiddelen',
        'Zorg voor duidelijke branding en online vindbaarheid',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['agrifood'] }),
    })
  }

  // ── 10b. OVERSTAP NAAR AKKERBOUW ────────────────────────────────────────────
  if (isVeehouderij && !wiltVerkopen) {
    scenarios.push({
      id: 'akkerbouw_doorstart',
      naam: 'Overstap naar akkerbouw',
      haalbaarheid: beperktGebied ? 'laag' : 'gemiddeld',
      icoon: '🌾',
      kengetallen: {
        investering:  haEigendom >= 10 ? bereik(haEigendom * 500, haEigendom * 2_000, '(ombouw)') : '€10k – €50k',
        inkomsten:    bereik(haEigendom * 1_200, haEigendom * 2_500, '/jr (indicatief)'),
        inkomstenType:'Akkerbouwopbrengst',
        doorlooptijd: '1 – 2 jaar',
        risico:       'Gemiddeld',
        kennis:       'Gemiddeld',
      },
      samenvatting: `Een gestopte veehouder kan als akkerbouwer op hetzelfde erf doorgaan. De grond behoudt zijn agrarische bestemming en u stopt met dierhouderij — maar niet met boeren. Niet alle percelen lenen zich direct voor akkerbouw, en het bestemmingsplan bepaalt welke gewassen en activiteiten zijn toegestaan.`,
      kansen: [
        'Grond behoudt agrarische bestemming — geen complexe herbestemming nodig',
        'Akkerbouw valt buiten de Lbv-regelingen — u bent vrij om door te gaan',
        'Lagere arbeidslast dan veehouderij — geen dagelijkse dierenverzorging',
        haEigendom >= 20 ? 'Voldoende schaal voor rendabele akkerbouwopzet' : 'Pachtcombinatie met buurpercelen kan schaal vergroten',
        'Combineerbaar met verpachten van deel grond aan akkerbouwer',
      ],
      pijnpunten: [
        'Niet alle grond is geschikt — kleigrond vs. zandgrond bepaalt teeltkeuze',
        'Omschakeling vergt investering in machines of samenwerking met loonwerker',
        'Akkerbouw is weersafhankelijk en marktgevoelig',
        'Vereist kennis van gewassen, bemesting en plaagbestrijding',
      ],
      duurzaamheid: {
        beschrijving: 'Biologische akkerbouw of regeneratieve teelt zijn groeiende markten met betere marges en subsidiekansen.',
        subsidies: 'GLB-subsidies (basispremie, ecoregelingen), biologische omschakelingssubsidie (RVO), ANLb voor akkerranden.',
        onderhoudslast: 'Seizoensgebonden — hoog in oogst- en zaaiperiode, lager in de winter.',
      },
      relevanteRegelingen: ['Gecombineerde Opgave (RVO) — nieuwe GLB-aanvraag', 'Omgevingsloket — check toegestane gewassen op perceel', 'Biologische omschakelingssubsidie (RVO)'],
      vervolgstap: `Controleer via omgevingsloket.nl welke gewassen en activiteiten op uw percelen in ${gemeente || provincie} zijn toegestaan. Bespreek met een akkerbouwconsulent of uw grondtype geschikt is.`,
      aandachtspunten: [
        'Fosfaatrechten vervallen bij stoppen met melkvee — check de timing',
        'Bij ombouw: meld wijziging bij RVO voor de Gecombineerde Opgave',
        'Grondwaterstand en bodemtype zijn bepalend voor teeltkeuze',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['akkerbouw_doorstart'] }),
    })
  }

  // ── 11. VERKOOP ─────────────────────────────────────────────────────────────
  if (wiltVerkopen || maxOpbrengst || korteHorizon) {
    scenarios.push({
      id: 'verkoop',
      naam: 'Verkoop',
      haalbaarheid: 'hoog',
      icoon: '💰',
      kengetallen: kengetallenVerkoop({ ha: haEigendom, m2: m2AgrarischTotaal, heeftPacht: a.heeftPachtcontract }),
      samenvatting: `Verkoop van grond en/of gebouwen in ${gemeente || provincie}. De grondmarkt in Nederland is krap — agrarische grond is schaars en waardevol. ${wozHoog ? `In ${gemeente || provincie} zijn de vastgoedwaarden hoog — gunstig voor de verkoopprijs.` : `Met ${ha} ha is dit een substantiële transactie.`}`,
      kansen: [
        'Direct liquiditeit — geen langjarige betrokkenheid',
        `Grondmarkt in ${provincie || 'Nederland'} is krap — verkopers staan sterk`,
        korteHorizon ? 'Passend bij uw korte tijdshorizon' : '',
        a.heeftPachtcontract !== 'ja' ? 'Vrije grond brengt maximale prijs' : '',
      ].filter(Boolean),
      pijnpunten: [
        a.heeftPachtcontract === 'ja' ? '⚠️ Verpachte grond verkoopt 30–50% lager (pachtkorting)' : '',
        a.heeftHypotheek === 'ja' ? '⚠️ Hypotheek aflossen bij verkoop — check restschuld' : '',
        'Stakingswinst en landbouwvrijstelling: fiscale berekening noodzakelijk',
        'Eenmaal verkocht is onomkeerbaar',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Bestemming na verkoop bepaalt de duurzaamheidswaarde. Overweeg verkoop aan natuurorganisatie of grondfonds voor groene bestemming.',
        subsidies: 'Geen subsidies van toepassing bij reguliere verkoop.',
        onderhoudslast: 'Geen — na verkoop.',
      },
      relevanteRegelingen: ['Landbouwvrijstelling (art. 3.12 IB 2001)', 'Vrijstelling overdrachtsbelasting agrarisch'],
      vervolgstap: 'Laat een gecertificeerd taxateur de marktwaarde en WEVAB bepalen. Raadpleeg uw accountant over fiscale gevolgen vóór tekenen.',
      aandachtspunten: [
        'Laat de WEVAB (waarde economisch verkeer agrarisch gebruik) onafhankelijk bepalen',
        'Overdrachtsbelasting: 2% agrarisch, 10,4% niet-agrarisch — dit beïnvloedt onderhandeling',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['verkoop'] }),
    })
  }

  // ── 12. VERPACHTEN ──────────────────────────────────────────────────────────
  if (wiltVerpachten || rustZekerheid || (!wiltVerkopen && scenarios.length < 3)) {
    scenarios.push({
      id: 'verpachten',
      naam: 'Verpachten',
      haalbaarheid: a.heeftPachtcontract === 'ja' ? 'gemiddeld' : 'hoog',
      icoon: '📋',
      kengetallen: kengetallenVerpachten({ ha }),
      samenvatting: `Verpachten van uw grond in ${gemeente || provincie} biedt stabiel inkomen zonder te verkopen. U kunt kiezen tussen reguliere pacht (lage prijs, sterke huurdersbescherming) of geliberaliseerde pacht (marktconform, flexibel).`,
      kansen: [
        'Direct inkomen zonder investering',
        'Grond behoudt eigendomswaarde — geen definitieve beslissing',
        rustZekerheid ? 'Past bij uw wens voor rust en zekerheid' : '',
        'Verpachte grond gunstig bij erfopvolging (lagere fiscale waarde)',
      ].filter(Boolean),
      pijnpunten: [
        'Reguliere pacht: lage pachtprijs, sterke huurdersbescherming — moeilijk opzegbaar',
        'Verpachte grond bij verkoop: 30–50% pachtkorting',
        a.heeftPachtcontract === 'ja' ? '⚠️ Bestaand pachtcontract loopt door — check looptijd' : '',
      ].filter(Boolean),
      duurzaamheid: {
        beschrijving: 'Bij geliberaliseerde pacht kunt u duurzaamheidseisen opnemen in het contract (bijv. geen glyfosaat, biodiversiteitsstroken).',
        subsidies: 'Geen directe subsidies. ANLb-vergoeding kan deels via pachtcontract worden geregeld.',
        onderhoudslast: 'Laag — huurder is verantwoordelijk voor gebruik, u voor groot onderhoud.',
      },
      relevanteRegelingen: ['Pachtnormen (jaarlijks vastgesteld)', 'Geliberaliseerde pacht (vrij onderhandelbaar)', 'Agrarische bestemming blijft behouden'],
      vervolgstap: 'Bepaal reguliere of geliberaliseerde pacht. Laat een pachtcontract opstellen door een rentmeester of jurist.',
      aandachtspunten: [
        'Stel altijd een schriftelijk pachtcontract op — mondelinge afspraken zijn rechtsgeldig maar onverstandig',
        'Geliberaliseerde pacht: maximaal 6 jaar zonder verlengingsplicht',
      ],
      fiscaal: bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds: ['verpachten'] }),
    })
  }

  // Sorteer + verrijk met uitgebreide geo-data
  const volgorde = { hoog: 0, gemiddeld: 1, laag: 2 }

  const geoFlags = {
    stikstofKritisch, stikstofOverbelast, bodemAlert,
    heeftMonument, inBeschermdeGezicht, cultuurhistorischWrd,
    netcongestieVol, netcongEstieDruk, netbeheerder,
    bevolkingskrimp, bevolkingsgroei, woningdrukHoog, wozHoog,
    cbsBevolking, cbsWoningdruk, cbsWoz,
    erfgoedBeperkt, omgevingsBeperkt,
    gemeente, provincie,
  }

  return scenarios
    .sort((a, b) => volgorde[a.haalbaarheid] - volgorde[b.haalbaarheid])
    .slice(0, 6)
    .map(s => verrijkMetGeoData(s, geoFlags))
}

// ─── GEO-DATA VERRIJKING ──────────────────────────────────────────────────────
// Post-processing stap: voeg geo-specifieke waarschuwingen + haalbaarheids-
// aanpassingen toe op basis van de nieuwe API-checks.
// ─────────────────────────────────────────────────────────────────────────────

function verrijkMetGeoData(scenario, flags) {
  const {
    stikstofKritisch, stikstofOverbelast, bodemAlert,
    heeftMonument, inBeschermdeGezicht, cultuurhistorischWrd,
    netcongestieVol, netcongEstieDruk, netbeheerder,
    bevolkingskrimp, bevolkingsgroei, woningdrukHoog, wozHoog,
    cbsBevolking, cbsWoningdruk, erfgoedBeperkt,
    gemeente, provincie,
  } = flags

  // Kopieer zodat we niet muteren
  let haalbaarheid = scenario.haalbaarheid
  const kansen           = [...(scenario.kansen        || [])]
  const pijnpunten       = [...(scenario.pijnpunten    || [])]
  const aandachtspunten  = [...(scenario.aandachtspunten || [])]
  const geoSignalen      = []   // nieuwe sectie in detail-view

  // ── Monument & beschermd gezicht ─────────────────────────────────────────
  if (heeftMonument) {
    pijnpunten.push('⚠️ Rijksmonument aanwezig — verbouw vereist goedkeuring monumentencommissie (Wabo)')
    aandachtspunten.push('Monumentenvergunning vereist bij wijziging aan beschermd pand')
    geoSignalen.push({ type: 'warning', tekst: 'Rijksmonument op/nabij het erf' })
    // Sloop (rood-voor-rood) wordt moeilijker
    if (['rood_voor_rood'].includes(scenario.id)) {
      haalbaarheid = haalbaarheidVerlagen(haalbaarheid)
    }
  }

  if (inBeschermdeGezicht) {
    pijnpunten.push('⚠️ Beschermd stads-/dorpsgezicht — welstandseisen en extra toetsing verplicht')
    geoSignalen.push({ type: 'warning', tekst: 'Beschermd gezicht van toepassing' })
  }

  // ── Cultuurhistorie (positief voor NSW / landgoed) ────────────────────────
  if (cultuurhistorischWrd) {
    if (['nsw', 'natuur'].includes(scenario.id)) {
      kansen.push('Cultuurhistorische waarden op locatie — versterkt NSW-rangschikking en subsidiekansen')
      geoSignalen.push({ type: 'info', tekst: 'Cultuurhistorische waarden aanwezig' })
    }
  }

  // ── Stikstof ──────────────────────────────────────────────────────────────
  if (stikstofKritisch && ['lbv'].includes(scenario.id)) {
    kansen.unshift('Stikstof-overbelasting verhoogt kans op gunstige uitkoopregeling')
    geoSignalen.push({ type: 'info', tekst: 'Stikstofkritisch gebied — gunstig voor Lbv' })
  }
  if (stikstofOverbelast && ['vab_wonen', 'recreatie', 'vakantiewoningen'].includes(scenario.id)) {
    aandachtspunten.push('Stikstofoverbelasting: vergunningverlening voor nieuwe bebouwing kan vertragen')
    geoSignalen.push({ type: 'warning', tekst: 'Stikstof-overbelast gebied' })
  }

  // ── Bodem / sanering ─────────────────────────────────────────────────────
  if (bodemAlert && ['vab_wonen', 'rood_voor_rood', 'recreatie', 'vakantiewoningen'].includes(scenario.id)) {
    pijnpunten.push('⚠️ Milieuonderzoek in omgeving aangetroffen — verplicht bodemonderzoek vóór functiewijziging')
    aandachtspunten.push('Controleer bodemloket.nl op historische verontreiniging')
    geoSignalen.push({ type: 'warning', tekst: 'Milieuhygiënisch bodemonderzoek aanwezig in BRO' })
    if (['vab_wonen', 'rood_voor_rood'].includes(scenario.id)) {
      haalbaarheid = haalbaarheidVerlagen(haalbaarheid)
    }
  }

  // ── Netcongestie ─────────────────────────────────────────────────────────
  if (netcongestieVol && ['zonnepanelen'].includes(scenario.id)) {
    haalbaarheid = 'laag'
    pijnpunten.push(`⚠️ Netcongestie: ${netbeheerder || 'netbeheerder'} heeft net in deze regio vol verklaard — teruglevering >15 kWp gepauzeerd`)
    geoSignalen.push({ type: 'warning', tekst: `Netcongestie — ${netbeheerder}` })
  } else if (netcongEstieDruk && ['zonnepanelen'].includes(scenario.id)) {
    aandachtspunten.push(`Beperkte netcapaciteit (${netbeheerder}) — klein project (<15 kWp) doorgaans wel mogelijk`)
    geoSignalen.push({ type: 'info', tekst: `Netdruk — ${netbeheerder}` })
  }

  // ── CBS woningvraag / bevolking ────────────────────────────────────────
  if (woningdrukHoog && ['vab_wonen', 'rood_voor_rood', 'vakantiewoningen'].includes(scenario.id)) {
    kansen.push(`Hoge woningvraag in ${gemeente || provincie} — sterke afzetmarkt voor woningen en verhuur`)
    if (haalbaarheid === 'gemiddeld') haalbaarheid = 'hoog'
    geoSignalen.push({ type: 'positief', tekst: 'Hoge woningdruk in uw gemeente' })
  }

  if (bevolkingskrimp && ['vab_wonen', 'rood_voor_rood'].includes(scenario.id)) {
    haalbaarheid = haalbaarheidVerlagen(haalbaarheid)
    pijnpunten.push(`Bevolkingskrimp in ${gemeente || provincie} — woningvraag beperkt, vooronderzoek markt noodzakelijk`)
    geoSignalen.push({ type: 'warning', tekst: 'Bevolkingskrimp in uw gemeente' })
  }

  if (bevolkingsgroei && ['natuur', 'nsw'].includes(scenario.id)) {
    aandachtspunten.push('Regio groeit — overweeg combinatie natuur + recreatief toegankelijk gebied voor maatschappelijke meerwaarde')
  }

  if (wozHoog && ['verkoop', 'rood_voor_rood'].includes(scenario.id)) {
    kansen.push(`Hoge WOZ-waarden in ${gemeente || provincie} — gunstige verkoopprijs en kavelbijdrage te verwachten`)
    geoSignalen.push({ type: 'positief', tekst: 'Hoge vastgoedwaarden in uw gemeente' })
  }

  return {
    ...scenario,
    haalbaarheid,
    kansen,
    pijnpunten,
    aandachtspunten,
    geoSignalen,   // nieuwe array voor Stap3 — geo-specifieke badges
  }
}

/**
 * Verlaag haalbaarheid één stap (hoog → gemiddeld → laag)
 */
function haalbaarheidVerlagen(h) {
  if (h === 'hoog')     return 'gemiddeld'
  if (h === 'gemiddeld') return 'laag'
  return 'laag'
}

// ─── FISCALE BESLISBOOM (behouden uit v1) ─────────────────────────────────────

export function bepaalFiscaleModules({ antwoorden: a, haEigendom, scenarioIds = [] }) {
  const modules = []
  const isStoppend     = a.situatie === 'stoppend' || a.situatie === 'zonder_opvolger'
  const wiltVerkopen   = (a.wensen || []).includes('verkopen') || (a.wensen || []).includes('deels_verkopen')
  const wiltVerpachten = (a.wensen || []).includes('verpachten')
  const heeftOpvolger  = ['ja', 'onzeker'].includes(a.heeftOpvolger)
  const heeftFOR       = ['ja', 'weet_niet'].includes(a.heeftFOR)
  const haGroot        = (haEigendom || 0) >= 5
  const scenarioLandgoed   = scenarioIds.includes('nsw')
  const scenarioVerkoop    = scenarioIds.includes('verkoop') || wiltVerkopen
  const heeftExploitatie   = (a.wensen || []).some(w => ['functiewijziging', 'landgoed'].includes(w)) ||
    scenarioIds.some(id => ['vab_wonen','recreatie','vakantiewoningen','zorgboerderij','bedrijfsruimte','agrifood'].includes(id))

  if (wiltVerkopen || (isStoppend && a.heeftPachtcontract !== 'ja')) {
    const isWaarschuwing = (a.wensen || []).some(w => ['functiewijziging','landgoed'].includes(w))
    modules.push({
      id: 'landbouwvrijstelling', titel: 'Landbouwvrijstelling', prioriteit: 2,
      waarschuwing: isWaarschuwing,
      kernboodschap: isWaarschuwing
        ? '⚠️ Bij bestemmingswijziging (wonen/recreatie) is het bestemmingswijzigingsvoordeel volledig belast (tot 49,5%). Raadpleeg een fiscalist vóór enige toezegging aan koper of gemeente.'
        : 'Waardestijging van agrarische grond is mogelijk vrijgesteld van inkomstenbelasting. Laat uw boekwaarde en de vrijstelling berekenen.',
      actie: 'Laat uw accountant de agrarische boekwaarde en de eventuele vrijstelling berekenen.',
    })
  }

  if (isStoppend || (wiltVerkopen && !wiltVerpachten)) {
    modules.push({
      id: 'stakingswinst', titel: 'Stakingswinst', prioriteit: 1, waarschuwing: false,
      kernboodschap: heeftFOR
        ? 'Bij staking rekent u af over de stakingswinst én de FOR valt vrij — dit verhoogt de belastbare winst. Bespreek omzetting naar lijfrente met uw accountant.'
        : 'Bij staking rekent u af over de stakingswinst (verschil boekwaarde – werkelijke waarde). Stakingsvrijstelling is van toepassing.',
      actie: 'Laat uw accountant berekenen welk jaar het gunstigst is om te staken — dit kan tienduizenden euro\'s schelen.',
    })
  }

  if (heeftOpvolger) {
    modules.push({
      id: 'bor', titel: 'Bedrijfsopvolgingsregeling (BOR)', prioriteit: 3,
      waarschuwing: a.heeftPachtcontract === 'ja',
      kernboodschap: a.heeftOpvolger === 'onzeker'
        ? 'Als u overweegt het bedrijf aan kinderen of familie over te dragen, kan de BOR grote belastingvoordelen bieden. Laat dit beoordelen, ook als u nog geen beslissing heeft genomen.'
        : a.heeftPachtcontract === 'ja'
          ? '⚠️ Verpachte grond kwalificeert mogelijk niet voor de BOR. Laat dit specifiek toetsen.'
          : 'De BOR kan een groot deel van de schenk- of erfbelasting bij bedrijfsoverdracht vrijstellen. Regeling is recent gewijzigd.',
      actie: 'Vraag een fiscalist naar de BOR en de doorschuifregeling (DSR) voor uw specifieke situatie.',
    })
  }

  if (scenarioVerkoop || scenarioLandgoed) {
    modules.push({
      id: 'overdrachtsbelasting', titel: 'Overdrachtsbelasting', prioriteit: 5, waarschuwing: false,
      kernboodschap: heeftOpvolger && wiltVerkopen
        ? 'Bij overdracht aan kinderen of familie is vrijstelling mogelijk via het BOR-traject.'
        : 'Koper betaalt 2% bij agrarisch gebruik door agrarische koper, 10,4% bij niet-agrarische koper. Dit beïnvloedt de onderhandeling.',
      actie: 'Weeg de overdrachtsbelasting mee in uw vraagprijs en betrek de notaris vroeg.',
    })
  }

  if (heeftExploitatie && !wiltVerkopen) {
    modules.push({
      id: 'btw', titel: 'BTW bij nieuwe exploitatie', prioriteit: 6, waarschuwing: false,
      kernboodschap: 'Bij recreatieve verhuur bent u btw-plichtig (9%) maar kunt u btw op investeringen terugvragen. Registreer u als btw-ondernemer bij de Belastingdienst.',
      actie: 'Registreer u als btw-ondernemer bij de Belastingdienst zodra u start met exploitatie.',
    })
  }

  if (scenarioLandgoed || ((a.wensen || []).includes('landgoed') && haGroot)) {
    modules.push({
      id: 'nsw', titel: 'NSW-landgoedvrijstellingen', prioriteit: 4, waarschuwing: false,
      kernboodschap: heeftOpvolger
        ? 'Een NSW-landgoed biedt vrijstelling van OZB, box 3 en bij overdracht binnen familie vrijstelling van schenk-/erfbelasting.'
        : 'Een NSW-landgoed biedt vrijstelling van OZB en box 3 vermogensbelasting.',
      actie: 'Vraag de provincie naar de NSW-rangschikking voor uw locatie.',
    })
  }

  if (!wiltVerkopen && heeftExploitatie) {
    modules.push({
      id: 'mia_eia', titel: 'MIA, VAMIL en EIA (investeringsaftrek)', prioriteit: 7, waarschuwing: true,
      kernboodschap: '⚠️ Meld uw investering binnen 3 maanden na bestelling bij RVO.nl. Te late melding betekent verlies van aftrek. MIA geeft 27–45% extra aftrek op milieu-investeringen.',
      actie: 'Check de actuele Milieulijst op RVO.nl vóór u investeert, en meld direct na bestelling.',
    })
  }

  modules.sort((a, b) => a.prioriteit - b.prioriteit)
  return {
    modules,
    disclaimer: 'De bedragen die hier spelen kunnen oplopen tot tienduizenden of honderdduizenden euro\'s. Dit is een oriëntatie, geen advies. Raadpleeg een agrarisch fiscalist of accountant voordat u beslissingen neemt.',
  }
}
