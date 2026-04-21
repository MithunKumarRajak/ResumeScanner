import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ScanLine } from 'lucide-react'
import useStore from '../store'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'

export default function AuthModal() {
  const isOpen = useStore((s) => s.isAuthModalOpen)
  const closeAuthModal = useStore((s) => s.closeAuthModal)
  const [tab, setTab] = useState('login')

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeAuthModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-fade-in">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl shadow-black/30">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white">
                  <ScanLine className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Account</h2>
                  <p className="text-xs text-slate-400">Sign in or create an account</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="mb-5 flex rounded-lg border border-slate-800 bg-slate-900 p-1">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${
                  tab === 'login' ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400'
                }`}
              >
                Sign in
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${
                  tab === 'signup' ? 'bg-sky-500 text-white' : 'bg-transparent text-slate-400'
                }`}
              >
                Sign up
              </button>
            </div>

            {tab === 'login' ? <LoginForm /> : <SignupForm />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
