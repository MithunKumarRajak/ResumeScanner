import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, Mail, Lock, Shield, Trash2, Save, CheckCircle2, AlertCircle,
  Loader2, Calendar, Database, FileText, ChevronRight, Eye, EyeOff
} from 'lucide-react'
import useStore from '../store'
import { apiUpdateProfile, apiChangePassword, apiDeleteAccount, apiGetMe } from '../services/api'

function SectionCard({ icon: Icon, title, subtitle, color = 'indigo', children }) {
  const colors = {
    indigo: 'bg-indigo-500/15 text-indigo-400',
    amber: 'bg-amber-500/15 text-amber-400',
    red: 'bg-red-500/15 text-red-400',
    emerald: 'bg-emerald-500/15 text-emerald-400',
  }
  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700/40">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function StatusBanner({ type, message, onClose }) {
  if (!message) return null
  const styles = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
  }
  const icons = { success: CheckCircle2, error: AlertCircle }
  const StatusIcon = icons[type]
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${styles[type]} animate-fade-in`}>
      <StatusIcon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100 cursor-pointer">✕</button>
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const user = useStore(s => s.user)
  const login = useStore(s => s.login)
  const logout = useStore(s => s.logout)

  // Profile form
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  // Password form
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' })
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  // Delete account
  const [deletePw, setDeletePw] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState({ type: '', text: '' })

  // Account info
  const [accountInfo, setAccountInfo] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    apiGetMe().then(u => setAccountInfo(u)).catch(() => {})
  }, [user, navigate])

  if (!user) return null

  const handleProfileSave = async () => {
    setProfileMsg({ type: '', text: '' })
    if (!profileName.trim()) { setProfileMsg({ type: 'error', text: 'Name cannot be empty' }); return }
    if (!profileEmail.trim()) { setProfileMsg({ type: 'error', text: 'Email cannot be empty' }); return }
    setProfileLoading(true)
    try {
      const updated = await apiUpdateProfile(profileName.trim(), profileEmail.trim())
      login(updated) // re-save to store + localStorage
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to update profile' })
    } finally {
      setProfileLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    setPwMsg({ type: '', text: '' })
    if (!currentPw) { setPwMsg({ type: 'error', text: 'Enter your current password' }); return }
    if (newPw.length < 6) { setPwMsg({ type: 'error', text: 'New password must be at least 6 characters' }); return }
    if (newPw !== confirmPw) { setPwMsg({ type: 'error', text: 'New passwords do not match' }); return }
    setPwLoading(true)
    try {
      const result = await apiChangePassword(currentPw, newPw)
      // Update token in store
      login({ ...user, token: result.token })
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setPwMsg({ type: 'success', text: 'Password changed successfully!' })
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password' })
    } finally {
      setPwLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteMsg({ type: '', text: '' })
    if (!deletePw) { setDeleteMsg({ type: 'error', text: 'Enter your password to confirm' }); return }
    setDeleteLoading(true)
    try {
      await apiDeleteAccount(deletePw)
      logout()
      navigate('/')
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to delete account' })
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{user.name}</h1>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
        </div>
        {accountInfo?.created_at && (
          <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Member since {new Date(accountInfo.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>

      {/* ── Profile Info ── */}
      <SectionCard icon={User} title="Profile Information" subtitle="Update your name and email">
        <StatusBanner type={profileMsg.type} message={profileMsg.text} onClose={() => setProfileMsg({ type: '', text: '' })} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                className="form-input pl-11" placeholder="Your name" id="profile-name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)}
                className="form-input pl-11" placeholder="your@email.com" id="profile-email"
              />
            </div>
          </div>
        </div>
        <button onClick={handleProfileSave} disabled={profileLoading}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm" id="save-profile-btn">
          {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </SectionCard>

      {/* ── Change Password ── */}
      <SectionCard icon={Lock} title="Change Password" subtitle="Keep your account secure" color="amber">
        <StatusBanner type={pwMsg.type} message={pwMsg.text} onClose={() => setPwMsg({ type: '', text: '' })} />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showCurrentPw ? 'text' : 'password'} value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                className="form-input pl-11 pr-10" placeholder="Enter current password" id="current-password"
              />
              <button onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showNewPw ? 'text' : 'password'} value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  className="form-input pl-11 pr-10" placeholder="Min 6 characters" id="new-password"
                />
                <button onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className="form-input pl-11" placeholder="Repeat new password" id="confirm-password"
                />
              </div>
            </div>
          </div>
        </div>
        <button onClick={handlePasswordChange} disabled={pwLoading}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700" id="change-password-btn">
          {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
          Change Password
        </button>
      </SectionCard>

      {/* ── Saved Data ── */}
      <SectionCard icon={Database} title="Saved Data" subtitle="Your persisted data on the server" color="emerald">
        <div className="space-y-2">
          {[
            { key: 'parsed_resume', label: 'Parsed Resume', icon: FileText },
            { key: 'resume_build', label: 'Resume Builder', icon: FileText },
            { key: 'job_description', label: 'Job Description', icon: FileText },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ── Delete Account ── */}
      <SectionCard icon={Trash2} title="Delete Account" subtitle="Permanently delete your account and all data" color="red">
        <StatusBanner type={deleteMsg.type} message={deleteMsg.text} onClose={() => setDeleteMsg({ type: '', text: '' })} />
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
          <p className="text-sm text-red-300/80">
            This action is <strong>irreversible</strong>. All your saved resumes, parsed data, and account information will be permanently deleted.
          </p>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)}
              className="text-sm font-medium text-red-400 hover:text-red-300 cursor-pointer bg-transparent border-none underline underline-offset-2" id="delete-account-toggle">
              I want to delete my account
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400/50" />
                <input
                  type="password" value={deletePw} onChange={e => setDeletePw(e.target.value)}
                  className="form-input pl-11 border-red-500/30 focus:border-red-500/50 focus:ring-red-500/20"
                  placeholder="Enter your password to confirm" id="delete-password"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={handleDeleteAccount} disabled={deleteLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition-all cursor-pointer" id="confirm-delete-btn">
                  {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Account
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeletePw('') }}
                  className="btn-ghost text-sm" id="cancel-delete-btn">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
