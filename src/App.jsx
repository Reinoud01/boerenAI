import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Stap1Kaart from './pages/Stap1Kaart'
import Stap2Vragen from './pages/Stap2Vragen'
import Stap3Resultaat from './pages/Stap3Resultaat'
import Stap4CTA from './pages/Stap4CTA'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/kaart" element={<Stap1Kaart />} />
      <Route path="/vragen" element={<Stap2Vragen />} />
      <Route path="/resultaat" element={<Stap3Resultaat />} />
      <Route path="/gesprek" element={<Stap4CTA />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
