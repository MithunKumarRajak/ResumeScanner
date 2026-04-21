import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AuthModal from './components/AuthModal'
import HomePage from './pages/HomePage'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/candidate" element={<CandidatePage />} />
          <Route path="/recruiter" element={<RecruiterPage />} />
          {/* Legacy redirect */}
          <Route path="/results" element={<Navigate to="/candidate" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <AuthModal />
    </div>
  )
}
