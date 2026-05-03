import { useState, useEffect } from 'react'
import { X, ScanLine } from 'lucide-react'
import useStore from '../store'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

export default function AuthModal() {
  const isOpen = useStore((s) => s.isAuthModalOpen)
  const closeAuthModal = useStore((s) => s.closeAuthModal)
  const [tab, setTab] = useState('login')

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') closeAuthModal() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, closeAuthModal])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in"
        onClick={closeAuthModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-slate-700/60 bg-[rgba(15,23,42,0.97)] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50">

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Welcome</h2>
                <p className="text-xs text-slate-400">Sign in or create your account</p>
              </div>
            </div>
            <button
              onClick={closeAuthModal}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/50 text-slate-400 hover:text-white cursor-pointer transition-colors"
              id="auth-modal-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="mb-6 flex rounded-xl border border-slate-700/50 bg-slate-800/40 p-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all border-none ${
                tab === 'login'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="auth-tab-login"
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all border-none ${
                tab === 'signup'
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-transparent text-slate-400 hover:text-slate-200'
              }`}
              id="auth-tab-signup"
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          {tab === 'login' ? <LoginForm /> : <SignupForm />}
        </div>
      </div>
    </div>
  )
}
