import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiResetPassword } from '../services/api'
import useStore from '../store'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const openAuthModal = useStore((s) => s.openAuthModal)
  const token = searchParams.get('token') || ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!token) {
      setError('Reset token is missing or invalid.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      await apiResetPassword(token, newPassword)
      setSuccess('Password updated successfully. You can now sign in with the new password.')
      toast.success('Password updated successfully. Redirecting to Sign In...')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password')
      toast.error(err.response?.data?.detail || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  // After successful reset, auto-open login modal and navigate home
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => {
      openAuthModal('login')
      navigate('/')
    }, 1800)
    return () => clearTimeout(t)
  }, [success, openAuthModal, navigate])

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg glass-card p-6 sm:p-8 space-y-6 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Reset Password</h1>
            <p className="text-sm text-slate-400">Set a new password for your account.</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="form-input pr-4"
            autoComplete="new-password"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="form-input pr-4"
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={loading || !token}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            navigate('/')
            openAuthModal()
          }}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Login
        </button>
      </div>
    </div>
  )
}