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
  { icon: FileSearch, title: 'Resume Parsing', text: 'Extract text from PDF and DOCX files, then keep the parsed profile editable.' },
  { icon: Gauge, title: 'Match Scoring', text: 'Compare a resume with a job description and show clear score drivers.' },
  { icon: ClipboardCheck, title: 'ATS Review', text: 'Flag resume structure problems before a candidate applies or a recruiter shortlists.' },
  { icon: Users, title: 'Recruiter Ranking', text: 'Turn completed analyses into a ranked candidate view for repeated hiring work.' },
]

function WorkflowItem({ number, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-black">
        {number}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">{text}</p>
      </div>
    </div>
  )
}

function ProductPreview() {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/80 p-4 shadow-2xl shadow-black/40">
      <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Analysis Report</p>
          <p className="mt-1 text-sm font-semibold text-white">Frontend Engineer Resume</p>
        </div>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Strong Match
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs text-slate-500">Match</p>
          <p className="mt-2 text-2xl font-bold text-white">82%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs text-slate-500">ATS</p>
          <p className="mt-2 text-2xl font-bold text-white">91</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
          <p className="text-xs text-slate-500">Model</p>
          <p className="mt-2 text-2xl font-bold text-white">V6</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Skill Coverage</p>
          <p className="text-xs text-slate-500">12 of 16 matched</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-[76%] rounded-full bg-emerald-400" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['React', 'FastAPI', 'SQL', 'Python'].map((skill) => (
            <span key={skill} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-black">{skill}</span>
          ))}
          {['AWS', 'Docker'].map((skill) => (
            <span key={skill} className="rounded-full border border-dashed border-slate-600 px-2.5 py-1 text-xs text-slate-400">{skill}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {['Add two quantified React achievements.', 'Mention Docker deployment experience.', 'Move contact details to the top section.'].map((tip) => (
          <div key={tip} className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
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
      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_520px] lg:px-8 lg:py-16">
        <div className="flex flex-col justify-center">
          <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            <span className="text-xs font-semibold text-slate-300">AI-assisted resume screening for candidates and recruiters</span>
          </div>

          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            ResumeScanner turns resumes into clear hiring decisions.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Upload a resume, compare it with a job description, review ATS issues, and save a report that candidates and recruiters can act on.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => navigate('/candidate')} className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3">
              Analyze Resume <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/recruiter')} className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3">
              Recruiter Dashboard <Users className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {PRODUCT_STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-1 text-xs text-slate-400">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section className="border-y border-slate-800 bg-slate-950/50">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Workflow</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">One clean path from upload to report.</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <WorkflowItem number="1" title="Upload or paste resume text" text="Parse PDF or DOCX content and keep the extracted profile available for editing." />
            <WorkflowItem number="2" title="Add target job description" text="Use the same JD for match score, missing skills, and candidate readiness." />
            <WorkflowItem number="3" title="Run ML and ATS checks" text="Predict category, calculate match score, and highlight formatting risks." />
            <WorkflowItem number="4" title="Save, edit, or export" text="Store the report, open the resume editor, or export results for sharing." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Platform</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">Built for repeated resume screening work.</h2>
          </div>
          <button onClick={() => navigate('/ai-generator')} className="btn-secondary inline-flex items-center gap-2">
            Generate Job Description <Layers3 className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <feature.icon className="h-6 w-6 text-emerald-300" />
              <h3 className="mt-4 text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
            </div>
          ))}
        </div>


      </section>
    </div>
  )
}
