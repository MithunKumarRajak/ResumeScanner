import { useEffect } from 'react'
import { X, ScanLine } from 'lucide-react'
import useStore from '../store'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import ForgotPasswordForm from './ForgotPasswordForm'

export default function AuthModal() {
  const isOpen = useStore((s) => s.isAuthModalOpen)
  const closeAuthModal = useStore((s) => s.closeAuthModal)
  const authModalTab = useStore((s) => s.authModalTab)
  const setAuthModalTab = useStore((s) => s.setAuthModalTab)

  const normalizedTab = ['login', 'signup', 'forgot'].includes(authModalTab) ? authModalTab : 'login'

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') closeAuthModal()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, closeAuthModal])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const tab = normalizedTab

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={closeAuthModal}
      />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="rounded-2xl border border-slate-700/60 bg-[rgba(15,23,42,0.97)] backdrop-blur-xl p-6 sm:p-8 shadow-2xl shadow-black/50">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-lg">
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

          {tab === 'login' && (
            <LoginForm
              onForgotPassword={() => setAuthModalTab('forgot')}
              onSignUp={() => setAuthModalTab('signup')}
            />
          )}

          {tab === 'signup' && (
            <SignupForm onSignIn={() => setAuthModalTab('login')} />
          )}

          {tab === 'forgot' && (
            <ForgotPasswordForm onBackToLogin={() => setAuthModalTab('login')} />
          )}

          {!['login', 'signup', 'forgot'].includes(tab) && (
            <LoginForm
              onForgotPassword={() => setAuthModalTab('forgot')}
              onSignUp={() => setAuthModalTab('signup')}
            />
          )}
        </div>
      </div>
    </div>
  )
}
