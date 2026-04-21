import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ScanLine, LogIn, LogOut, User, ChevronDown, Cpu, Users } from 'lucide-react'
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

  const handleLogoClick = () => {
    clearAnalysis()
    navigate('/')
  }

  const navLink = (to, label, Icon, id) => {
    const active = location.pathname === to
    return (
      <button
        id={id}
        onClick={() => navigate(to)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-none
          ${active
            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
          }`}
      >
        <Icon className="h-4 w-4" />
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/70 bg-[rgba(15,23,42,0.9)] backdrop-blur-md">
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
            Resume<span className="gradient-text">Screener</span>
          </span>
        </button>

        {/* Center nav links */}
        <div className="flex items-center gap-1">
          {navLink('/candidate', 'Candidate', Cpu,   'nav-candidate')}
          {navLink('/recruiter', 'Recruiter', Users, 'nav-recruiter')}
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
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-800 bg-slate-900 p-1 shadow-lg shadow-black/40 animate-fade-in">
                  <button
                    onClick={() => { logout(); setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5 bg-transparent border-none cursor-pointer"
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
              className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 cursor-pointer hover:bg-slate-800/80 transition-colors"
              id="nav-signin-btn"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>

      </div>
    </nav>
  )
}
