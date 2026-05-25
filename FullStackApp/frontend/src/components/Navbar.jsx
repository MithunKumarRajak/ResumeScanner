import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, LogIn, LogOut, User, ChevronDown, Home, Cpu, Users, FileEdit, Wand2, Menu, X, UploadCloud, Columns, Search } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import useStore from '../store'
import { useApiStatus } from '../hooks/useApiStatus'

export default function Navbar({ onSearch }) {
  const user           = useStore((s) => s.user)
  const logout         = useStore((s) => s.logout)
  const openAuthModal  = useStore((s) => s.openAuthModal)
  const clearAnalysis  = useStore((s) => s.clearAnalysis)
  const navigate       = useNavigate()
  const location       = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: apiStatus, isError: apiOffline } = useApiStatus()

  const handleLogoClick = () => {
    clearAnalysis()
    navigate('/')
  }

  const ALL_LINKS = [
    { to: '/',            label: 'Home',         icon: Home,        showTo: ['all', 'candidate', 'recruiter'] },
    { to: '/candidate',   label: 'Candidate',    icon: Cpu,         showTo: ['all', 'candidate'] },
    { to: '/recruiter',   label: 'Recruiter',    icon: Users,       showTo: ['all', 'recruiter'] },
    { to: '/editor', label: 'Resume Editor', icon: FileEdit,    showTo: ['candidate'] },
    { to: '/ai-generator',  label: 'AI Generator',  icon: Wand2,       showTo: ['recruiter'] },
    { to: '/bulk-upload', label: 'Bulk Upload',  icon: UploadCloud, showTo: ['recruiter'] },
    { to: '/compare',     label: 'Compare',      icon: Columns,     showTo: ['recruiter'] },
    { to: '/advanced',      label: 'Advanced AI',  icon: Cpu,         showTo: ['recruiter'] },
  ]

  const userRole = user?.role || 'all'
  const NAV_LINKS = ALL_LINKS.filter(link => link.showTo.includes(userRole))

  const navLink = (to, label, Icon, id) => {
    const active = location.pathname === to
    return (
      <button
        id={id}
        key={to}
        onClick={() => { navigate(to); setMobileOpen(false) }}
        className={`relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all cursor-pointer border-none whitespace-nowrap
          ${active
            ? 'text-[#2dd4a8]'
            : 'text-[#9898a8] hover:text-[#f0f0f5]'
          }`}
        style={{ background: 'transparent' }}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
        {/* Underline active indicator — human nav pattern */}
        {active && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-[#2dd4a8] to-[#6366f1]" />
        )}
      </button>
    )
  }

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(17,17,24,0.88)] backdrop-blur-xl" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Subtle gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(45,212,168,0.15)] to-transparent" />

      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

        {/* Logo — gradient border outline style */}
        <button
          onClick={handleLogoClick}
          className="flex shrink-0 items-center gap-2.5 bg-transparent border-none cursor-pointer group"
          id="nav-logo"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl gradient-border group-hover:scale-105 transition-transform" style={{ background: 'rgba(26,26,34,0.9)' }}>
            <ScanLine className="h-5 w-5 text-[#2dd4a8]" />
          </div>
          <span className="hidden text-base font-bold text-[#f0f0f5] sm:inline tracking-tight font-display">
            Resume<span className="gradient-text">Scanner</span>
          </span>
        </button>

        {/* Center nav links – Desktop — underline style, not pill-bar */}
        <div className="hidden xl:flex items-center gap-0.5">
          {NAV_LINKS.map((l) =>
            navLink(l.to, l.label, l.icon, `nav-${l.label.toLowerCase().replace(' ', '-')}`)
          )}
        </div>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-2.5">
          {/* Minimal status dot — not a screaming badge */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium text-[#5e5e72]"
            title={apiOffline ? 'Backend API offline' : `Backend ${apiStatus?.status || 'online'}, DB ${apiStatus?.database || 'unknown'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${apiOffline ? 'bg-red-400' : apiStatus?.database === 'degraded' ? 'bg-amber-400' : 'bg-[#2dd4a8]'}`} />
            {apiOffline ? 'Offline' : apiStatus?.database === 'degraded' ? 'Degraded' : ''}
          </div>

          {/* Search trigger */}
          <button
            onClick={onSearch}
            className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.5)] px-3 py-1.5 text-sm text-[#9898a8] hover:text-[#f0f0f5] hover:border-[rgba(255,255,255,0.12)] cursor-pointer transition-all"
            id="nav-search-btn"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Search</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-[rgba(42,42,50,0.7)] border border-[rgba(255,255,255,0.06)] text-[10px] font-medium text-[#5e5e72] ml-1">⌘K</kbd>
          </button>

          <DarkModeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] px-3 py-2 text-sm text-[#d4d4de] cursor-pointer hover:bg-[rgba(42,42,50,0.6)] transition-colors"
                id="nav-user-menu"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#2dd4a8] to-[#6366f1] text-[#111118]">
                  <User className="h-3 w-3" />
                </div>
                <span className="hidden sm:inline font-medium">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-[#5e5e72]" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.95)] p-1.5 shadow-elevated backdrop-blur-xl animate-fade-in">
                  <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)] mb-1">
                    <p className="text-xs font-semibold text-[#f0f0f5] truncate">{user.name}</p>
                    <p className="text-[11px] text-[#5e5e72] truncate">{user.email}</p>
                    <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      user.role === 'recruiter'
                        ? 'bg-gradient-to-r from-[rgba(45,212,168,0.15)] to-[rgba(99,102,241,0.15)] text-[#2dd4a8] border border-[rgba(45,212,168,0.2)]'
                        : 'bg-[rgba(42,42,50,0.7)] text-[#9898a8] border border-[rgba(255,255,255,0.08)]'
                    }`}>
                      {user.role === 'recruiter' ? 'Recruiter' : 'Candidate'}
                    </span>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#b8b8c1] hover:bg-[rgba(45,212,168,0.05)] bg-transparent border-none cursor-pointer"
                    id="nav-profile-btn"
                  >
                    <User className="h-4 w-4" />
                    Profile & Settings
                  </button>
                  <button
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 bg-transparent border-none cursor-pointer"
                    id="nav-logout-btn"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={openAuthModal}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap"
              id="nav-signin-btn"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] bg-transparent text-[#9898a8] hover:text-white cursor-pointer transition-colors"
            id="nav-mobile-toggle"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="xl:hidden border-t border-[rgba(255,255,255,0.04)] bg-[rgba(17,17,24,0.97)] backdrop-blur-xl animate-fade-in">
          <div className="flex flex-col gap-1 p-3">
            {NAV_LINKS.map((l) =>
              navLink(l.to, l.label, l.icon, `nav-mobile-${l.label.toLowerCase().replace(' ', '-')}`)
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
