import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useScanStore from '../store/useScanStore'
import Layout from '../components/Layout'

export default function Stap4CTA() {
  const navigate = useNavigate()
  const { antwoorden, scenarios, setHuidigeStap } = useScanStore()
  const [form, setForm] = useState({ naam: '', email: '', telefoon: '', vraag: '' })
  const [verstuurd, setVerstuurd] = useState(false)
  const [laden, setLaden] = useState(false)

  useEffect(() => {
    setHuidigeStap(4)
    if (scenarios.length === 0) navigate('/kaart')
  }, [])

  const handleVerstuur = async (e) => {
    e.preventDefault()
    setLaden(true)
    // TODO Fase 2: verstuur naar backend / HubSpot CRM
    // Voor nu: simuleer een korte wachttijd
    await new Promise(r => setTimeout(r, 800))
    setVerstuurd(true)
    setLaden(false)
  }

  if (verstuurd) {
    return (
      <Layout huidigeStap={4}>
        <div className="max-w-xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 bg-brand-green flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
          <h1 className="text-2xl font-semibold uppercase mb-4">Aanvraag ontvangen</h1>
          <p className="text-sm text-brand-gray-dark leading-relaxed mb-8">
            Bedankt, {form.naam}. We nemen binnen één werkdag contact met u op via {form.email}.
            In de tussentijd kunt u uw scanresultaten nog eens rustig bekijken.
          </p>
          <button
            onClick={() => navigate('/resultaat')}
            className="text-xs uppercase tracking-widest underline hover:no-underline"
          >
            ← Terug naar uw scenario's
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout huidigeStap={4}>
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-widest text-brand-gray-dark mb-3">Vrijblijvend gesprek</p>
        <h1 className="text-3xl font-semibold uppercase mb-4">Plan een gesprek</h1>
        <p className="text-sm text-brand-gray-dark leading-relaxed mb-8">
          Vul uw gegevens in. Wij nemen binnen één werkdag contact met u op voor een
          vrijblijvend gesprek van 30 minuten met een gespecialiseerde adviseur.
        </p>

        {/* Samenvatting scan */}
        <div className="bg-brand-green p-5 mb-8">
          <p className="text-xs uppercase tracking-widest font-semibold mb-3">Uw scan samenvatting</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {antwoorden.bedrijfstype && <span><strong>Bedrijfstype:</strong> {antwoorden.bedrijfstype}</span>}
            {antwoorden.provincie && <span><strong>Provincie:</strong> {antwoorden.provincie}</span>}
            <span><strong>Scenario's:</strong> {scenarios.length} gevonden</span>
            {scenarios[0] && <span><strong>Beste optie:</strong> {scenarios[0].naam}</span>}
          </div>
        </div>

        <form onSubmit={handleVerstuur} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-2">Naam *</label>
              <input
                required type="text" value={form.naam}
                onChange={e => setForm(f => ({...f, naam: e.target.value}))}
                className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none"
                placeholder="Voor- en achternaam"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest font-semibold mb-2">E-mailadres *</label>
              <input
                required type="email" value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none"
                placeholder="naam@bedrijf.nl"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest font-semibold mb-2">Telefoonnummer</label>
            <input
              type="tel" value={form.telefoon}
              onChange={e => setForm(f => ({...f, telefoon: e.target.value}))}
              className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none"
              placeholder="+31 6 ..."
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest font-semibold mb-2">
              Uw vraag of aanvulling (optioneel)
            </label>
            <textarea
              value={form.vraag}
              onChange={e => setForm(f => ({...f, vraag: e.target.value}))}
              rows={3}
              className="w-full border border-brand-gray-light px-3 py-3 text-sm focus:border-black outline-none resize-none"
              placeholder="Bijv. welk scenario spreekt u het meeste aan, of heeft u een specifieke vraag?"
            />
          </div>

          <p className="text-xs text-brand-gray-dark">
            Uw gegevens worden vertrouwelijk behandeld en niet gedeeld met derden.
            U kunt zich op elk moment uitschrijven.
          </p>

          <button
            type="submit"
            disabled={laden}
            className="w-full bg-black text-white font-semibold text-xs uppercase tracking-widest py-4 hover:bg-brand-green hover:text-black transition-colors disabled:bg-brand-gray-mid"
          >
            {laden ? 'Versturen…' : 'Verstuur aanvraag →'}
          </button>
        </form>

        <button
          onClick={() => navigate('/resultaat')}
          className="mt-4 text-xs uppercase tracking-widest text-brand-gray-dark underline hover:no-underline"
        >
          ← Terug naar uw scenario's
        </button>
      </div>
    </Layout>
  )
}
