import { useState } from 'react'
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiForgotPassword } from '../services/api'

export default function ForgotPasswordForm({ onBackToLogin = () => {} }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetUrl, setResetUrl] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setResetUrl('')

    if (!email.trim()) {
      setError('Enter your email address')
      return
    }

    setLoading(true)
    try {
      const result = await apiForgotPassword(email.trim())
      setSuccess(result.message || 'If the email exists, a password reset link has been sent.')
      toast.success('If the email exists, a reset link was sent.')
      if (result.reset_url) {
        setResetUrl(result.reset_url)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset link. Try again later.')
      toast.error(err.response?.data?.detail || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="space-y-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {success}
          </div>
          {resetUrl && (
            <a href={resetUrl} className="block break-all text-xs text-emerald-200 underline underline-offset-2">
              Dev reset link: {resetUrl}
            </a>
          )}
        </div>
      )}

      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBackToLogin}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
        </button>
      </div>
    </form>
  )
}