import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-brand-gray-light flex items-center justify-between px-6 md:px-10">
        <span className="font-semibold text-xs tracking-widest uppercase">
          Boer Transitie<br/>Scanner
        </span>
        <span className="hidden md:inline text-xs text-brand-gray-dark uppercase tracking-widest">Gratis quickscan</span>
        <button
          onClick={() => navigate('/kaart')}
          className="md:hidden bg-brand-green text-black font-semibold text-xs uppercase tracking-widest px-4 py-2 hover:bg-black hover:text-white transition-colors"
        >
          Start de scan →
        </button>
      </header>

      {/* Hero */}
      <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
        {/* Links: nieuwe tekst */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 md:w-3/5 border-r border-brand-gray-light">
          <h1 className="text-3xl md:text-4xl font-semibold leading-snug mb-10">
            Wat doe ik met mijn erf als ik stop?
          </h1>
          <div className="space-y-5 text-base text-brand-gray-dark leading-relaxed max-w-xl">
            <p>
              Je hebt je leven in dit bedrijf gestoken. Generaties werk zit in de muren, de grond, de gebouwen.
              En nu stopt het, of overweeg je te stoppen. Dan wil je weten wat er mogelijk is.
              Niet over een jaar, na maanden adviseurs.
            </p>
            <p>
              Normaal gesproken moet je daarvoor langs de makelaar, de fiscalist, de gemeente én de provincie.
              En dan zelf maar uitzoeken hoe die antwoorden bij elkaar passen. Terwijl jij gewoon wilt weten:
              wat kan ik met mijn erf?
            </p>
            <p>
              Deze tool stelt je de juiste vragen, en geeft je een eerlijk overzicht van wat er met jouw erf
              kan: woningbouw, landgoed, natuur, zorg, recreatie, inclusief welke subsidies er zijn en waar
              je fiscaal op moet letten.
            </p>
            <p>
              Geen jargon of stapels beleid. Gewoon een helder startpunt.
            </p>
          </div>
          <p className="mt-10 text-xs text-brand-gray-dark">
            Geen account nodig. Geen verplichtingen. Uitsluitend een oriëntatie — geen juridisch advies.
          </p>
        </div>

        {/* Rechts: CTA */}
        <div className="flex flex-col justify-center items-start px-8 md:px-16 py-20 md:w-2/5">
          <p className="text-xs uppercase tracking-widest text-brand-gray-dark mb-8">
            Gratis — Laagdrempelig — Onafhankelijk
          </p>
          <button
            onClick={() => navigate('/kaart')}
            className="bg-brand-green text-black font-semibold text-sm uppercase tracking-widest px-10 py-5 hover:bg-black hover:text-white transition-colors"
          >
            Start de scan →
          </button>
          <p className="mt-4 text-xs text-brand-gray-dark">
            Vul je situatie in, het duurt nog geen tien minuten.
          </p>
        </div>
      </div>

      {/* Wat genereert de scanner — scrollbaar bereikbaar */}
      <div className="flex flex-col md:flex-row border-t border-brand-gray-light">
        {/* Vier stappen */}
        <div className="px-8 md:px-16 py-16 md:w-3/5 border-r border-brand-gray-light">
          <h2 className="text-xs uppercase tracking-widest font-semibold mb-8">
            Wat genereert de scanner?
          </h2>
          <div className="space-y-0 border-t border-brand-gray-light">
            {[
              {
                nr: '01',
                titel: 'Uw grond in kaart',
                tekst: 'Selecteer uw percelen via de kaart of voer uw gegevens handmatig in. De tool checkt automatisch of u nabij Natura 2000 of NNN ligt.',
              },
              {
                nr: '02',
                titel: 'Gerichte vragenlijst',
                tekst: 'Twaalf vragen over uw bedrijfstype, wensen en financiële situatie. Duurt ongeveer vijf minuten.',
              },
              {
                nr: '03',
                titel: '3–5 concrete scenario\'s',
                tekst: 'Van landgoedvorming tot beëindigingsregeling — met haalbaarheid, fiscale richting en eerste vervolgstap per scenario.',
              },
              {
                nr: '04',
                titel: 'Persoonlijk gesprek',
                tekst: 'Na de scan kunt u een vrijblijvend gesprek plannen met een gespecialiseerd adviseur.',
              },
            ].map(item => (
              <div key={item.nr} className="flex gap-6 py-6 border-b border-brand-gray-light">
                <span className="text-xl font-semibold text-brand-gray-light w-8 shrink-0">{item.nr}</span>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide mb-1">{item.titel}</p>
                  <p className="text-sm text-brand-gray-dark leading-relaxed">{item.tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Waarom gratis */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 md:w-2/5">
          <div className="bg-brand-green p-5">
            <p className="text-xs uppercase tracking-widest font-semibold mb-1">Waarom gratis?</p>
            <p className="text-sm leading-relaxed">
              De scanner is onze manier om u een inzicht te geven in uw kansen. Als u na de scan
              meer wilt weten, plannen we een gesprek. Pas dan gaan we dieper in op uw situatie.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
