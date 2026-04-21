import { useNavigate } from 'react-router-dom'
import { Cpu, Users, Zap, Shield, BarChart3, FileSearch } from 'lucide-react'

function EntryCard({ id, icon: Icon, title, subtitle, accent, onClick, features }) {
  return (
    <button
      id={id}
      onClick={onClick}
      className="glass-card-hover w-full text-left p-7 space-y-5 group cursor-pointer"
    >
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${accent.bg} ${accent.text} group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="h-7 w-7" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-1.5">{title}</h2>
        <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>
      </div>

      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
            {f}
          </li>
        ))}
      </ul>

      <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${accent.btn} transition-all group-hover:gap-3`}>
        Get Started →
      </div>
    </button>
  )
}

function StatPill({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 glass-card px-4 py-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-16 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5 animate-fade-in">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 tracking-wide">ML-Powered Resume Screening</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4 animate-slide-up max-w-3xl">
          Find the{' '}
          <span className="gradient-text">Perfect Match</span>
          {' '}between Talent & Role
        </h1>

        <p className="max-w-xl text-base sm:text-lg text-slate-400 mb-10 animate-slide-up leading-relaxed" style={{ animationDelay: '0.1s' }}>
          Upload resumes, analyze job descriptions, and instantly get AI-powered
          match scores, skill gap analysis, and recruiter-ready rankings.
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mb-12 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <StatPill icon={FileSearch}  label="Resume Analysis"    value="Real-time"  color="bg-indigo-500/15 text-indigo-400" />
          <StatPill icon={BarChart3}   label="Match Accuracy"      value="TF-IDF ML" color="bg-violet-500/15 text-violet-400" />
          <StatPill icon={Shield}      label="Data Stays Local"    value="100%"       color="bg-emerald-500/15 text-emerald-400" />
        </div>

        {/* Entry Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-2xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <EntryCard
            id="home-candidate-btn"
            icon={Cpu}
            title="I'm a Candidate"
            subtitle="Upload your resume, edit parsed data, and match it against a job description."
            accent={{
              bg:   'bg-indigo-500/15',
              text: 'text-indigo-400',
              dot:  'bg-indigo-400',
              btn:  'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
            }}
            features={[
              'Drag & drop PDF / DOCX upload',
              'Edit extracted skills & experience',
              'Match score with skill gap analysis',
              'Personalised job recommendations',
            ]}
            onClick={() => navigate('/candidate')}
          />

          <EntryCard
            id="home-recruiter-btn"
            icon={Users}
            title="I'm a Recruiter"
            subtitle="View ranked candidates, filter by skills or experience, and compare match scores."
            accent={{
              bg:   'bg-violet-500/15',
              text: 'text-violet-400',
              dot:  'bg-violet-400',
              btn:  'bg-violet-500/15 text-violet-300 border border-violet-500/25',
            }}
            features={[
              'Session candidate ranking table',
              'Sort by match score or experience',
              'Filter by skill keyword',
              'Export-ready summary view',
            ]}
            onClick={() => navigate('/recruiter')}
          />
        </div>
      </div>
    </div>
  )
}
