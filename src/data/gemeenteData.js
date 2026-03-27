/**
 * Alle Nederlandse gemeenten per provincie (stand 2025)
 * Bron: CBS / Kadaster gemeentegrenzen
 * Gebruik: dropdown provincie → gemeente in Stap 1
 */
export const PROVINCIES = [
  'Drenthe',
  'Flevoland',
  'Friesland',
  'Gelderland',
  'Groningen',
  'Limburg',
  'Noord-Brabant',
  'Noord-Holland',
  'Overijssel',
  'Utrecht',
  'Zeeland',
  'Zuid-Holland',
]

export const GEMEENTEN_PER_PROVINCIE = {
  Drenthe: [
    'Aa en Hunze', 'Assen', 'Borger-Odoorn', 'Coevorden', 'De Wolden',
    'Emmen', 'Hoogeveen', 'Meppel', 'Midden-Drenthe', 'Noordenveld',
    'Tynaarlo', 'Westerveld',
  ],
  Flevoland: [
    'Almere', 'Dronten', 'Lelystad', 'Noordoostpolder', 'Urk', 'Zeewolde',
  ],
  Friesland: [
    'Achtkarspelen', 'Ameland', 'Dantumadiel', 'De Fryske Marren',
    'Harlingen', 'Heerenveen', 'Leeuwarden', 'Noardeast-Fryslân',
    'Ooststellingwerf', 'Opsterland', 'Schiermonnikoog', 'Smallingerland',
    'Súdwest-Fryslân', 'Terschelling', 'Tytsjerksteradiel', 'Vlieland',
    'Waadhoeke', 'Weststellingwerf',
  ],
  Gelderland: [
    'Aalten', 'Apeldoorn', 'Arnhem', 'Barneveld', 'Berg en Dal',
    'Berkelland', 'Beuningen', 'Bronckhorst', 'Brummen', 'Buren',
    'Culemborg', 'Doesburg', 'Doetinchem', 'Druten', 'Duiven',
    'Ede', 'Elburg', 'Epe', 'Ermelo', 'Harderwijk',
    'Hattem', 'Heerde', 'Heumen', 'Lingewaard', 'Lochem',
    'Maasdriel', 'Montferland', 'Neder-Betuwe', 'Nijkerk', 'Nijmegen',
    'Nunspeet', 'Oost Gelre', 'Overbetuwe', 'Putten', 'Renkum',
    'Rheden', 'Rozendaal', 'Scherpenzeel', 'Tiel', 'Voorst',
    'Wageningen', 'West Betuwe', 'West Maas en Waal', 'Westervoort',
    'Wijchen', 'Winterswijk', 'Zaltbommel', 'Zevenaar', 'Zutphen',
  ],
  Groningen: [
    'Eemsdelta', 'Groningen', 'Het Hogeland', 'Midden-Groningen',
    'Oldambt', 'Pekela', 'Stadskanaal', 'Veendam',
    'Westerkwartier', 'Westerwolde',
  ],
  Limburg: [
    'Beek', 'Beekdaelen', 'Bergen', 'Beesel', 'Brunssum',
    'Echt-Susteren', 'Eijsden-Margraten', 'Gennep', 'Gulpen-Wittem',
    'Heerlen', 'Horst aan de Maas', 'Kerkrade', 'Landgraaf',
    'Leudal', 'Maasgouw', 'Maastricht', 'Meerssen', 'Meijel (Peel en Maas)',
    'Nederweert', 'Peel en Maas', 'Roerdalen', 'Roermond',
    'Simpelveld', 'Sittard-Geleen', 'Stein', 'Vaals',
    'Valkenburg aan de Geul', 'Venlo', 'Venray', 'Voerendaal', 'Weert',
  ],
  'Noord-Brabant': [
    'Alphen-Chaam', 'Altena', 'Asten', 'Baarle-Nassau', 'Bergen op Zoom',
    'Best', 'Bladel', 'Boxtel', 'Breda', 'Cranendonck',
    'Cuijk', 'Deurne', 'Dongen', 'Eersel', 'Eindhoven',
    'Etten-Leur', 'Geldrop-Mierlo', 'Gemert-Bakel', 'Gilze en Rijen',
    'Goirle', 'Halderberge', 'Heeze-Leende', 'Helmond', 'Hilvarenbeek',
    'Land van Cuijk', 'Laarbeek', 'Loon op Zand', 'Maashorst',
    'Meierijstad', 'Moerdijk', 'Nuenen c.a.', 'Oirschot',
    'Oisterwijk', 'Oosterhout', 'Oss', 'Rucphen',
    'Sint-Michielsgestel', 'Someren', 'Son en Breugel', 'Steenbergen',
    "s-Hertogenbosch", 'Tilburg', 'Valkenswaard', 'Veldhoven',
    'Vught', 'Waalre', 'Waalwijk', 'Woensdrecht', 'Zundert',
  ],
  'Noord-Holland': [
    'Aalsmeer', 'Alkmaar', 'Amstelveen', 'Amsterdam', 'Bergen',
    'Beverwijk', 'Bloemendaal', 'Castricum', 'Den Helder', 'Diemen',
    'Dijk en Waard', 'Drechterland', 'Edam-Volendam', 'Enkhuizen',
    'Gooise Meren', 'Haarlem', 'Haarlemmermeer', 'Heemskerk',
    'Heemstede', 'Heiloo', 'Hilversum', 'Hollands Kroon', 'Hoorn',
    'Huizen', 'Koggenland', 'Landsmeer', 'Laren', 'Medemblik',
    'Oostzaan', 'Opmeer', 'Ouder-Amstel', 'Purmerend',
    'Schagen', 'Stede Broec', 'Texel', 'Uitgeest', 'Uithoorn',
    'Velsen', 'Waterland', 'Wormerland', 'Zaanstad', 'Zandvoort',
  ],
  Overijssel: [
    'Almelo', 'Borne', 'Dalfsen', 'Deventer', 'Dinkelland',
    'Enschede', 'Haaksbergen', 'Hardenberg', 'Hellendoorn', 'Hengelo',
    'Hof van Twente', 'Kampen', 'Losser', 'Oldenzaal', 'Olst-Wijhe',
    'Ommen', 'Raalte', 'Rijssen-Holten', 'Staphorst', 'Steenwijkerland',
    'Tubbergen', 'Twenterand', 'Wierden', 'Zwartewaterland', 'Zwolle',
  ],
  Utrecht: [
    'Amersfoort', 'Baarn', 'Bunnink', 'Bunschoten', 'De Bilt',
    'De Ronde Venen', 'Eemnes', 'Houten', 'IJsselstein', 'Leusden',
    'Lopik', 'Montfoort', 'Nieuwegein', 'Oudewater', 'Renswoude',
    'Rhenen', 'Soest', 'Stichtse Vecht', 'Utrecht', 'Utrechtse Heuvelrug',
    'Veenendaal', 'Vijfheerenlanden', 'Wijk bij Duurstede', 'Woerden',
    'Woudenberg', 'Zeist',
  ],
  Zeeland: [
    'Borsele', 'Goes', 'Hulst', 'Kapelle', 'Middelburg',
    'Noord-Beveland', 'Reimerswaal', 'Schouwen-Duiveland',
    'Sluis', 'Terneuzen', 'Tholen', 'Veere', 'Vlissingen',
  ],
  'Zuid-Holland': [
    'Alblasserdam', 'Albrandswaard', 'Alphen aan den Rijn', 'Barendrecht',
    'Bodegraven-Reeuwijk', 'Brielle', 'Capelle aan den IJssel', 'Delft',
    'Dordrecht', 'Goeree-Overflakkee', 'Gorinchem', 'Gouda',
    'Hardinxveld-Giessendam', 'Hellevoetsluis', "s-Gravenhage",
    'Hendrik-Ido-Ambacht', 'Hillegom', 'Hoeksche Waard', 'Katwijk',
    'Krimpen aan den IJssel', 'Krimpenerwaard', 'Lansingerland',
    'Leiden', 'Leiderdorp', 'Leidschendam-Voorburg', 'Lisse',
    'Maassluis', 'Midden-Delfland', 'Molenlanden', 'Nieuwkoop',
    'Nissewaard', 'Noordwijk', 'Oegstgeest', 'Papendrecht',
    'Pijnacker-Nootdorp', 'Ridderkerk', 'Rotterdam', 'Rijswijk',
    'Schiedam', 'Sliedrecht', 'Teylingen', 'Vlaardingen',
    'Voorne aan Zee', 'Voorschoten', 'Waddinxveen', 'Wassenaar',
    'Westland', 'Woerden', 'Zwijndrecht', 'Zoetermeer', 'Zoeterwoude',
    'Zuidplas',
  ],
}

/** Geef gemeentenaam terug uit PDOK weergavenaam ("Gemeente Ede" → "Ede") */
export function parseerGemeentenaam(weergavenaam) {
  return weergavenaam?.replace(/^Gemeente\s+/i, '') || ''
}

/** Geef provincienaam terug uit PDOK weergavenaam ("Provincie Gelderland" → "Gelderland") */
export function parseerProvincienaam(weergavenaam) {
  return weergavenaam?.replace(/^Provincie\s+/i, '') || ''
}
