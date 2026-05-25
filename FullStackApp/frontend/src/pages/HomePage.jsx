import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Layers3,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

const PRODUCT_STATS = [
  { label: 'Latest model', value: 'V6', detail: 'hybrid ML scoring' },
  { label: 'Workflow', value: '4 steps', detail: 'upload to report' },
  { label: 'Outputs', value: 'PDF', detail: 'report and resume export' },
]

const FEATURES = [
  { icon: FileSearch, title: 'Resume Parsing', text: 'Extract text from PDF and DOCX files, then keep the parsed profile editable.', featured: true },
  { icon: Gauge, title: 'Match Scoring', text: 'Compare a resume with a job description and show clear score drivers.' },
  { icon: ClipboardCheck, title: 'ATS Review', text: 'Flag resume structure problems before a candidate applies or a recruiter shortlists.' },
  { icon: Users, title: 'Recruiter Ranking', text: 'Turn completed analyses into a ranked candidate view for repeated hiring work.' },
]

const WORKFLOW_STEPS = [
  { number: '01', title: 'Upload or paste resume text', text: 'Parse PDF or DOCX content and keep the extracted profile available for editing.' },
  { number: '02', title: 'Add target job description', text: 'Use the same JD for match score, missing skills, and candidate readiness.' },
  { number: '03', title: 'Run ML and ATS checks', text: 'Predict category, calculate match score, and highlight formatting risks.' },
  { number: '04', title: 'Save, edit, or export', text: 'Store the report, open the resume editor, or export results for sharing.' },
]

function ProductPreview() {
  return (
    <div
      className="rounded-[24px] border border-[rgba(255,255,255,0.06)] p-5 shadow-elevated"
      style={{
        background: 'rgba(17,17,24,0.85)',
        transform: 'rotate(-1.5deg)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="mb-4 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5e5e72] font-display">Live Analysis Report</p>
          <p className="mt-1 text-sm font-semibold text-[#f0f0f5]">Frontend Engineer Resume</p>
        </div>
        <span className="rounded-full border border-[rgba(45,212,168,0.2)] bg-[rgba(45,212,168,0.08)] px-3 py-1 text-xs font-semibold text-[#2dd4a8]">
          Strong Match
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] p-3">
          <p className="text-[10px] text-[#5e5e72] font-display">Match</p>
          <p className="mt-2 text-2xl font-bold text-[#f0f0f5] font-display">82%</p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] p-3">
          <p className="text-[10px] text-[#5e5e72] font-display">ATS</p>
          <p className="mt-2 text-2xl font-bold text-[#f0f0f5] font-display">91</p>
        </div>
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] p-3">
          <p className="text-[10px] text-[#5e5e72] font-display">Model</p>
          <p className="mt-2 text-2xl font-bold text-[#f0f0f5] font-display">V6</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.4)] p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#f0f0f5]">Skill Coverage</p>
          <p className="text-xs text-[#5e5e72]">12 of 16 matched</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
          <div className="h-full w-[76%] rounded-full bg-gradient-to-r from-[#2dd4a8] to-[#6366f1]" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['React', 'FastAPI', 'SQL', 'Python'].map((skill) => (
            <span key={skill} className="skill-match">{skill}</span>
          ))}
          {['AWS', 'Docker'].map((skill) => (
            <span key={skill} className="skill-missing">{skill}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {['Add two quantified React achievements.', 'Mention Docker deployment experience.', 'Move contact details to the top section.'].map((tip) => (
          <div key={tip} className="flex items-center gap-2 rounded-lg bg-[rgba(26,26,34,0.5)] px-3 py-2 text-sm text-[#b8b8c1]">
            <CheckCircle2 className="h-4 w-4 text-[#2dd4a8] shrink-0" />
            {tip}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* ── HERO ── */}
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_480px] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          {/* Badge — left accent bar style instead of sparkle pill */}
          <div className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.6)] px-4 py-2" style={{ borderLeft: '3px solid #2dd4a8' }}>
            <span className="text-xs font-semibold text-[#9898a8]">ML-assisted resume screening for candidates & recruiters</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[#f0f0f5] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1] font-display">
            ResumeScanner turns resumes into{' '}
            <span className="gradient-text">clear hiring decisions</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#9898a8]">
            Upload a resume, compare it with a job description, review ATS issues, and save a report that candidates and recruiters can act on.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/candidate')} className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3" id="hero-analyze-btn">
              Analyze Resume <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/recruiter')} className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3" id="hero-recruiter-btn">
              Recruiter Dashboard <Users className="h-4 w-4" />
            </button>
          </div>

          {/* Stats — horizontal strip with dividers instead of card grid */}
          <div className="mt-10 flex flex-wrap items-center gap-0 rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.4)] overflow-hidden">
            {PRODUCT_STATS.map((stat, i) => (
              <div key={stat.label} className={`flex-1 min-w-[140px] px-5 py-4 ${i < PRODUCT_STATS.length - 1 ? 'border-r border-[rgba(255,255,255,0.06)]' : ''}`}>
                <p className="text-xl font-bold text-[#f0f0f5] font-display">{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#5e5e72] font-display">{stat.label}</p>
                <p className="mt-0.5 text-xs text-[#9898a8]">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Preview — rotated offset, looks hand-placed */}
        <div className="flex items-center justify-center lg:justify-end animate-tilt-in" style={{ animationDelay: '0.2s' }}>
          <ProductPreview />
        </div>
      </section>

      {/* ── WORKFLOW — Connected timeline ── */}
      <section className="relative" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(17,17,24,0.5)' }}>
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2dd4a8] font-display">Workflow</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#f0f0f5] sm:text-3xl font-display">One clean path from upload to report.</h2>
          </div>

          {/* Timeline — connected with vertical line */}
          <div className="relative grid grid-cols-1 gap-0 md:grid-cols-4">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-6 left-[calc(12.5%+16px)] right-[calc(12.5%+16px)] h-px bg-gradient-to-r from-[rgba(45,212,168,0.3)] via-[rgba(99,102,241,0.2)] to-[rgba(45,212,168,0.1)]" />

            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.number} className="relative flex flex-col items-start px-4 py-6 md:items-center md:text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-display z-10"
                  style={{
                    background: i === 0 ? 'linear-gradient(135deg, #2dd4a8, #6366f1)' : 'rgba(26,26,34,0.9)',
                    color: i === 0 ? '#111118' : '#9898a8',
                    border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {step.number}
                </div>
                <h3 className="mt-3 text-sm font-semibold text-[#f0f0f5]">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#5e5e72] max-w-[200px]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES — Varied card sizes ── */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#2dd4a8] font-display">Platform</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#f0f0f5] sm:text-3xl font-display">Built for repeated resume screening work.</h2>
          </div>
          <button onClick={() => navigate('/ai-generator')} className="btn-secondary inline-flex items-center gap-2" id="hero-jd-gen-btn">
            Generate Job Description <Layers3 className="h-4 w-4" />
          </button>
        </div>

        {/* Varied card layout — first card is featured/larger, breaks uniform grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              className={`p-6 animate-tilt-in ${
                feature.featured
                  ? 'glass-card-featured md:col-span-2 xl:col-span-1 xl:row-span-1'
                  : 'glass-card'
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                feature.featured
                  ? 'bg-gradient-to-br from-[rgba(45,212,168,0.15)] to-[rgba(99,102,241,0.15)]'
                  : 'bg-[rgba(45,212,168,0.08)]'
              }`}>
                <feature.icon className={`h-5 w-5 ${feature.featured ? 'text-[#2dd4a8]' : 'text-[#2dd4a8]'}`} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#f0f0f5] font-display">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#9898a8]">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
