import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, LogIn, LogOut, User, ChevronDown, Home, Cpu, Users, FileEdit, Wand2, Menu, X } from 'lucide-react'
import DarkModeToggle from './DarkModeToggle'
import useStore from '../store'

export default function Navbar() {
  const user           = useStore((s) => s.user)
  const logout         = useStore((s) => s.logout)
  const openAuthModal  = useStore((s) => s.openAuthModal)
  const clearAnalysis  = useStore((s) => s.clearAnalysis)
  const navigate       = useNavigate()
  const location       = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogoClick = () => {
    clearAnalysis()
    navigate('/')
  }

  const NAV_LINKS = [
    { to: '/',            label: 'Home',         icon: Home    },
    { to: '/candidate',   label: 'Candidate',    icon: Cpu     },
    { to: '/recruiter',   label: 'Recruiter',    icon: Users   },
    { to: '/resume-build', label: 'Resume Build', icon: FileEdit },
    { to: '/ai-generator',  label: 'AI Generator',  icon: Wand2 },
  ]

  const navLink = (to, label, Icon, id) => {
    const active = location.pathname === to
    return (
      <button
        id={id}
        key={to}
        onClick={() => { navigate(to); setMobileOpen(false) }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
          ${active
            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/70 bg-[rgba(15,23,42,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <button
          onClick={handleLogoClick}
          className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer group"
          id="nav-logo"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-glow-brand group-hover:scale-105 transition-transform">
            <ScanLine className="h-5 w-5" />
          </div>
          <span className="hidden text-base font-bold text-white sm:inline tracking-tight">
            Resume<span className="gradient-text">Scanner</span>
          </span>
        </button>

        {/* Center nav links – Desktop */}
        <div className="hidden lg:flex items-center gap-1 rounded-2xl bg-slate-800/30 border border-slate-700/40 px-2 py-1 backdrop-blur-sm">
          {NAV_LINKS.map((l) =>
            navLink(l.to, l.label, l.icon, `nav-${l.label.toLowerCase().replace(' ', '-')}`)
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <DarkModeToggle />

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-800/80 transition-colors"
                id="nav-user-menu"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                  <User className="h-3 w-3" />
                </div>
                <span className="hidden sm:inline font-medium">{user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-800 bg-slate-900 p-1.5 shadow-lg shadow-black/40 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-800/60 mb-1">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 bg-transparent border-none cursor-pointer"
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
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:opacity-90 transition-all shadow-md shadow-indigo-500/25"
              id="nav-signin-btn"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700/50 bg-transparent text-slate-400 hover:text-white cursor-pointer transition-colors"
            id="nav-mobile-toggle"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800/60 bg-[rgba(15,23,42,0.97)] backdrop-blur-xl animate-fade-in">
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
