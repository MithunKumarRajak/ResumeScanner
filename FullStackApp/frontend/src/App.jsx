import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import HomePage from './pages/HomePage'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import ResumeBuildPage from './pages/ResumeBuildPage'
import AIGeneratorPage from './pages/AIGeneratorPage'
import ProfilePage from './pages/ProfilePage'
import CompareView from './pages/CompareView'
import BulkUpload from './components/BulkUpload'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import AdvancedDashboard from './pages/AdvancedDashboard'
import { AboutPage, PrivacyPage, TermsPage, ContactPage, DocsPage } from './pages/FooterPages'

export default function App() {
  const location = useLocation()
  const isEditorPage = location.pathname === '/resume-build' || location.pathname === '/ai-generator'

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/candidate" element={<CandidatePage />} />
            <Route path="/recruiter" element={<RecruiterPage />} />
            <Route path="/resume-build" element={<ResumeBuildPage />} />
            <Route path="/ai-generator" element={<AIGeneratorPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/compare" element={<CompareView />} />
            <Route path="/bulk-upload" element={<BulkUpload />} />
            <Route path="/advanced" element={<AdvancedDashboard />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/results" element={<Navigate to="/candidate" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!isEditorPage && <Footer />}
      <AuthModal />
      <Toaster position="bottom-right" />
    </div>
  )
}
