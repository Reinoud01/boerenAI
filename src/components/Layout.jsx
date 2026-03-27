import { useNavigate } from 'react-router-dom'
import useScanStore from '../store/useScanStore'

const STAPPEN = [
  { nr: 1, label: 'Uw grond', pad: '/kaart' },
  { nr: 2, label: 'Uw situatie', pad: '/vragen' },
  { nr: 3, label: 'Scenario\'s', pad: '/resultaat' },
]

export default function Layout({ children, huidigeStap }) {
  const navigate = useNavigate()
  const resetScan = useScanStore(s => s.resetScan)

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-16 border-b border-brand-gray-light bg-white sticky top-0 z-50 flex items-center justify-between px-6 md:px-10">
        <button
          onClick={() => navigate('/')}
          className="font-semibold text-xs tracking-widest uppercase text-black hover:opacity-60 transition-opacity"
        >
          Boer Transitie<br />Scanner
        </button>

        {/* Stap-indicator — alleen tonen als we in een stap zijn */}
        {huidigeStap > 0 && (
          <nav className="hidden md:flex items-center gap-0">
            {STAPPEN.map((stap, i) => {
              const actief = stap.nr === huidigeStap
              const klaar = stap.nr < huidigeStap
              return (
                <div key={stap.nr} className="flex items-center">
                  <div className={`flex items-center gap-2 px-4 py-1 border-b-2 transition-all ${
                    actief ? 'border-black' : klaar ? 'border-brand-gray-mid' : 'border-transparent'
                  }`}>
                    <span className={`w-5 h-5 flex items-center justify-center text-xs font-semibold border ${
                      actief ? 'bg-black text-white border-black'
                      : klaar ? 'bg-brand-green text-black border-brand-green'
                      : 'bg-white text-brand-gray-mid border-brand-gray-light'
                    }`}>
                      {klaar ? '✓' : stap.nr}
                    </span>
                    <span className={`text-xs uppercase tracking-widest font-semibold ${
                      actief ? 'text-black' : klaar ? 'text-brand-gray-dark' : 'text-brand-gray-mid'
                    }`}>
                      {stap.label}
                    </span>
                  </div>
                  {i < STAPPEN.length - 1 && (
                    <div className="w-8 h-px bg-brand-gray-light" />
                  )}
                </div>
              )
            })}
          </nav>
        )}

        <div className="text-xs text-brand-gray-dark uppercase tracking-widest">
          Gratis quickscan
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
