import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import HomePage from './pages/HomePage'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import ResumeBuildPage from './pages/ResumeBuildPage'
import AIGeneratorPage from './pages/AIGeneratorPage'

export default function App() {
  const location = useLocation()
  const isEditorPage = location.pathname === '/resume-build' || location.pathname === '/ai-generator'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/candidate" element={<CandidatePage />} />
          <Route path="/recruiter" element={<RecruiterPage />} />
          <Route path="/resume-build" element={<ResumeBuildPage />} />
          <Route path="/ai-generator" element={<AIGeneratorPage />} />
          <Route path="/results" element={<Navigate to="/candidate" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isEditorPage && <Footer />}
      <AuthModal />
    </div>
  )
}
