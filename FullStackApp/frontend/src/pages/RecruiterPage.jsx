import { Users, TrendingUp, Cpu, RefreshCw } from 'lucide-react'
import CandidateTable from '../components/CandidateTable'
import useStore from '../store'

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-card px-5 py-4 flex items-center gap-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function RecruiterPage() {
  const candidates = useStore((s) => s.candidates)

  const avg = candidates.length
    ? Math.round(candidates.reduce((a, c) => a + c.matchScore, 0) / candidates.length)
    : 0

  const topCat = (() => {
    if (!candidates.length) return '—'
    const freq = {}
    candidates.forEach((c) => { freq[c.category] = (freq[c.category] || 0) + 1 })
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]
  })()

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-6xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Recruiter <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Session-based candidate ranking — analyze resumes from the Candidate view to populate this table.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <StatCard
            icon={Users}
            label="Total Candidates"
            value={candidates.length}
            accent="bg-indigo-500/15 text-indigo-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Average Match Score"
            value={`${avg}%`}
            accent="bg-violet-500/15 text-violet-400"
          />
          <StatCard
            icon={Cpu}
            label="Top Category"
            value={topCat}
            accent="bg-emerald-500/15 text-emerald-400"
          />
        </div>
      )}

      {/* Top candidate highlight */}
      {candidates.length > 0 && (() => {
        const top = [...candidates].sort((a, b) => b.matchScore - a.matchScore)[0]
        return (
          <div className="glass-card p-5 flex flex-wrap items-center gap-4 border border-indigo-500/20 animate-fade-in">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-400">
              🏆
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">Top Candidate</p>
              <p className="font-semibold text-white truncate">{top.name}</p>
              <p className="text-xs text-slate-400">{top.category} · {top.matchScore}% match</p>
            </div>
            <div className="text-3xl font-extrabold text-amber-400">{top.matchScore}%</div>
          </div>
        )
      })()}

      {/* Table */}
      <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <CandidateTable />
      </div>

      {/* Help tip when empty */}
      {candidates.length === 0 && (
        <div className="glass-card p-8 text-center space-y-3 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-indigo-400 mb-2">
            <RefreshCw className="h-5 w-5" />
            <p className="font-semibold text-white">How to populate this dashboard</p>
          </div>
          <ol className="text-sm text-slate-400 text-left max-w-sm mx-auto space-y-2">
            <li>1. Go to the <strong className="text-slate-200">Candidate</strong> view</li>
            <li>2. Upload a resume and fill in the job description</li>
            <li>3. Click <strong className="text-slate-200">Match Resume</strong></li>
            <li>4. Return here to see the candidate ranked in the table</li>
          </ol>
        </div>
      )}
    </div>
  )
}
