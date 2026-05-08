import { useState } from 'react'
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Cpu, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useStore from '../store'
import { apiLogin } from '../services/api'

export default function LoginForm() {
  const login = useStore((s) => s.login)
  const navigate = useNavigate()
  const [role, setRole] = useState('candidate')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const userData = await apiLogin(email, password)
      // Override role from the selector (the backend returns the stored role, but user can choose which view to enter)
      login({ ...userData, role })
      navigate(role === 'recruiter' ? '/recruiter' : '/candidate')
    } catch (err) {
      const detail = err.response?.data?.detail || 'Login failed. Please check your credentials.'
      setError(detail)
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

      {/* Role Selector */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">I am a</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole('candidate')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold cursor-pointer border transition-all ${
              role === 'candidate'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            id="login-role-candidate"
          >
            <Cpu className="h-4 w-4" />
            Candidate
          </button>
          <button
            type="button"
            onClick={() => setRole('recruiter')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold cursor-pointer border transition-all ${
              role === 'recruiter'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
            id="login-role-recruiter"
          >
            <Users className="h-4 w-4" />
            Recruiter
          </button>
        </div>
      </div>

      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id="login-email"
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          id="login-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        id="login-submit-btn"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Sign In as {role === 'recruiter' ? 'Recruiter' : 'Candidate'} <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  )
}
