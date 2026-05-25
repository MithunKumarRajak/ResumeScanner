import { Users, TrendingUp, Cpu, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import CandidateTable from '../components/CandidateTable'
import useStore from '../store'
import { getAnalysisReports } from '../services/api'

function StatCard({ icon: Icon, label, value, accentPosition = 'left' }) {
  return (
    <div
      className="glass-card px-5 py-4 flex items-center gap-4"
      style={{
        borderLeft: accentPosition === 'left' ? '3px solid #2dd4a8' : undefined,
        borderTop: accentPosition === 'top' ? '3px solid #6366f1' : undefined,
        borderRadius: accentPosition === 'left' ? '4px 16px 16px 4px' : accentPosition === 'top' ? '4px 4px 16px 16px' : '16px',
      }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(45,212,168,0.08)]">
        <Icon className="h-5 w-5 text-[#2dd4a8]" />
      </div>
      <div>
        <p className="text-xl font-bold text-[#f0f0f5] leading-tight font-display">{value}</p>
        <p className="text-xs text-[#9898a8]">{label}</p>
      </div>
    </div>
  )
}

export default function RecruiterPage() {
  const candidates = useStore((s) => s.candidates)
  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['analysis-reports'],
    queryFn: getAnalysisReports,
    staleTime: 60 * 1000,
  })

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

      {/* Header — left-aligned, no centered */}
      <div className="flex flex-wrap items-start justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f0f0f5] font-display">
            Recruiter <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-sm text-[#9898a8] mt-1">
            Session-based candidate ranking — analyze resumes from the Candidate view to populate this table.
          </p>
        </div>
      </div>

      {/* Stats Row — varied accent positions */}
      {(candidates.length > 0 || reports.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <StatCard
            icon={Users}
            label="Total Candidates"
            value={Math.max(candidates.length, reports.length)}
            accentPosition="left"
          />
          <StatCard
            icon={TrendingUp}
            label="Average Match Score"
            value={`${avg}%`}
            accentPosition="top"
          />
          <StatCard
            icon={Cpu}
            label="Top Category"
            value={topCat}
            accentPosition="left"
          />
        </div>
      )}

      {/* Top candidate highlight — ribbon style */}
      {candidates.length > 0 && (() => {
        const top = [...candidates].sort((a, b) => b.matchScore - a.matchScore)[0]
        return (
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(45,212,168,0.15)] p-5 animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(45,212,168,0.04), rgba(99,102,241,0.02))' }}>
            {/* Ribbon accent */}
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#2dd4a8] to-[#6366f1] rounded-r" />
            <div className="flex flex-wrap items-center gap-4 pl-4">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#5e5e72] mb-0.5 font-display">Top Candidate</p>
                <p className="font-semibold text-[#f0f0f5] truncate">{top.name}</p>
                <p className="text-xs text-[#9898a8]">{top.category} · {top.matchScore}% match</p>
              </div>
              <div className="text-3xl font-bold gradient-text font-display">{top.matchScore}%</div>
            </div>
          </div>
        )
      })()}

      {/* Table */}
      <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
        <CandidateTable />
      </div>

      <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] p-5 animate-slide-up" style={{ animationDelay: '0.2s', background: 'rgba(17,17,24,0.5)' }}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#f0f0f5] font-display">Saved Analysis Reports</h2>
            <p className="text-sm text-[#9898a8]">Reports saved from the candidate workflow for signed-in users.</p>
          </div>
          <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] px-3 py-1 text-xs text-[#5e5e72]">
            {reportsLoading ? 'Loading...' : `${reports.length} saved`}
          </span>
        </div>

        {reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Role</th>
                  <th>Match</th>
                  <th>ATS</th>
                  <th>Status</th>
                  <th>Saved</th>
                </tr>
              </thead>
              <tbody>
                {reports.slice(0, 8).map((report) => (
                  <tr key={report.id}>
                    <td>{report.candidate_name || 'Candidate'}</td>
                    <td>{report.predicted_category || report.job_title || 'Unknown'}</td>
                    <td>{typeof report.match_score === 'number' ? `${Math.round(report.match_score)}%` : 'N/A'}</td>
                    <td>{typeof report.ats_score === 'number' ? Math.round(report.ats_score) : 'N/A'}</td>
                    <td>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.status === 'needs_review' ? 'bg-amber-500/10 text-amber-400' : 'bg-[rgba(45,212,168,0.1)] text-[#2dd4a8]'}`}>
                        {report.status === 'needs_review' ? 'Needs Review' : 'Saved'}
                      </span>
                    </td>
                    <td>{new Date(report.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[rgba(255,255,255,0.06)] p-6 text-center text-sm text-[#5e5e72]">
            Save a report from the Candidate workflow to build persistent recruiter history.
          </div>
        )}
      </div>

      {/* Help tip when empty */}
      {candidates.length === 0 && reports.length === 0 && (
        <div className="accent-card p-8 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-[#2dd4a8] mb-2">
            <RefreshCw className="h-5 w-5" />
            <p className="font-semibold text-[#f0f0f5] font-display">How to populate this dashboard</p>
          </div>
          <ol className="text-sm text-[#9898a8] text-left max-w-sm space-y-2">
            <li>1. Go to the <strong className="text-[#d4d4de]">Candidate</strong> view</li>
            <li>2. Upload a resume and fill in the job description</li>
            <li>3. Click <strong className="text-[#d4d4de]">Match Resume</strong></li>
            <li>4. Return here to see the candidate ranked in the table</li>
          </ol>
        </div>
      )}
    </div>
  )
}
