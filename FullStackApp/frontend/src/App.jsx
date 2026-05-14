import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import SearchOverlay from './components/SearchOverlay'
import HomePage from './pages/HomePage'
import CandidatePage from './pages/CandidatePage'
import RecruiterPage from './pages/RecruiterPage'
import ResumeBuildPage from './pages/ResumeBuildPage'
import EditorPage from './pages/Editor/EditorPage'
import AIGeneratorPage from './pages/AIGeneratorPage'
import ProfilePage from './pages/ProfilePage'
import CompareView from './pages/CompareView'
import ResetPasswordPage from './pages/ResetPasswordPage'
import BulkUpload from './components/BulkUpload'
import ErrorBoundary from './components/ErrorBoundary'
import NotFoundPage from './pages/NotFoundPage'
import { Toaster } from 'react-hot-toast'
import AdvancedDashboard from './pages/AdvancedDashboard'
import { AboutPage, PrivacyPage, TermsPage, ContactPage, DocsPage } from './pages/FooterPages'

export default function App() {
  const location = useLocation()
  const isEditorPage = location.pathname === '/resume-build' || location.pathname === '/editor' || location.pathname === '/ai-generator'
  const [searchOpen, setSearchOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearch={openSearch} />
      <SearchOverlay isOpen={searchOpen} onClose={closeSearch} />
      <main className="flex-1">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/candidate" element={<CandidatePage />} />
            <Route path="/recruiter" element={<RecruiterPage />} />
            <Route path="/resume-build" element={<ResumeBuildPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/ai-generator" element={<AIGeneratorPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/compare" element={<CompareView />} />
            <Route path="/bulk-upload" element={<BulkUpload />} />
            <Route path="/advanced" element={<AdvancedDashboard />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/results" element={<Navigate to="/candidate" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </main>
      {!isEditorPage && <Footer />}
      <AuthModal />
      <Toaster position="bottom-right" />
    </div>
  )
}
