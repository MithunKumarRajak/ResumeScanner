import { useState } from 'react'
import {
  Sparkles, Zap, Copy, Save, Send, Briefcase, MapPin,
  Clock, FileText, Settings2, Wand2, ChevronDown, Check, AlertCircle, Loader2
} from 'lucide-react'
import { aiGenerateJD, aiRefineJD } from '../services/api'

/* ── Constants ──────────────────────────────────────────── */
const DEPARTMENTS  = ['Engineering', 'Design', 'Product', 'Marketing', 'Data Science', 'DevOps', 'Sales']
const EXP_LEVELS   = ['Entry Level (0-2 yrs)', 'Mid Level (3-5 yrs)', 'Senior (5-8 yrs)', 'Lead / Principal (8+ yrs)']
const WORK_MODES   = ['On-site', 'Hybrid', 'Remote']
const TONES        = ['Professional & Direct', 'Energetic & Visionary', 'Casual & Approachable', 'Technical & Academic']
const FOCUS_AREAS  = ['Culture & Impact', 'Technical Depth', 'Growth & Leadership']

/* ── Pill selector ──────────────────────────────────────── */
function PillSelect({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border cursor-pointer
            ${value === opt
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
              : 'bg-transparent text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── Sample generated content ───────────────────────────── */
function sampleOutput(title, dept, expLevel, workMode) {
  return {
    title:    title || 'Senior Frontend Engineer',
    meta:     `${dept || 'Engineering'} • ${workMode || 'Hybrid'} • ${expLevel || 'Senior'}`,
    about:    `We are looking for a visionary ${title || 'Senior Frontend Engineer'} to join our core product team. In this role, you will be instrumental in architecting highly responsive, accessible, and performant user interfaces that empower HR professionals worldwide. You will bridge the gap between complex AI data structures and intuitive human experiences.`,
    tasks: [
      'Lead the technical design and implementation of new features using React and modern CSS architectures.',
      'Collaborate closely with UX/UI designers to translate high-fidelity prototypes into pixel-perfect, interactive components.',
      'Mentor junior engineers and establish best practices for code quality, testing, and performance optimization.',
      'Drive architectural decisions for our design system to ensure consistency across the platform.',
    ],
    requirements: [
      '5+ years of professional experience building scalable web applications.',
      'Deep expertise in JavaScript/TypeScript, React, and state management libraries.',
      'Strong understanding of web vitals, performance tuning, and browser rendering optimization.',
      'Experience creating and maintaining accessible (WCAG compliant) user interfaces.',
    ],
  }
}

/* ── Main Page ──────────────────────────────────────────── */
export default function AIGeneratorPage() {
  const [jobTitle,    setJobTitle]    = useState('')
  const [department,  setDepartment]  = useState('Engineering')
  const [expLevel,    setExpLevel]    = useState('Senior (5-8 yrs)')
  const [workMode,    setWorkMode]    = useState('Hybrid')
  const [rawNotes,    setRawNotes]    = useState('')
  const [tone,        setTone]        = useState('Energetic & Visionary')
  const [focusArea,   setFocusArea]   = useState('Culture & Impact')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generated,   setGenerated]   = useState(null)
  const [refineText,  setRefineText]  = useState('')
  const [copied,      setCopied]      = useState(false)
  const [error,       setError]       = useState('')
  const [isRefining,  setIsRefining]  = useState(false)

  const handleGenerate = async () => {
    if (!jobTitle.trim()) { setError('Please enter a job title'); return }
    setError('')
    setIsGenerating(true)
    try {
      const result = await aiGenerateJD({ jobTitle, department, expLevel, workMode, rawNotes, tone, focusArea })
      setGenerated(result)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Generation failed'
      if (err.response?.status === 503) {
        setError(detail)
      } else {
        setError(detail)
      }
      // Fallback to sample output if API fails
      setGenerated(sampleOutput(jobTitle, department, expLevel, workMode))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRefine = async () => {
    if (!refineText.trim() || !generated) return
    setIsRefining(true)
    const instruction = refineText
    setRefineText('')
    try {
      const result = await aiRefineJD(generated, instruction)
      setGenerated(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Refinement failed. Please try again.')
    } finally {
      setIsRefining(false)
    }
  }

  const handleCopy = () => {
    if (!generated) return
    const text = `${generated.title}\n${generated.meta}\n\nABOUT THE ROLE\n${generated.about}\n\nWHAT YOU'LL DO\n${generated.tasks.map(t => `• ${t}`).join('\n')}\n\nREQUIREMENTS\n${generated.requirements.map(r => `• ${r}`).join('\n')}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto space-y-8">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="animate-slide-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
            <Wand2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Job Description <span className="gradient-text">AI Generator</span>
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Configure parameters to generate a highly optimized, compelling job description.
            </p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ──────────────────── LEFT: Input & Config ──────── */}
        <div className="lg:col-span-5 space-y-5 animate-slide-up" style={{ animationDelay: '0.08s' }}>

          {/* Role Details Card */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-700/40 pb-3">
              <Briefcase className="h-4 w-4 text-indigo-400" />
              Role Details
            </h3>

            {/* Job Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="form-input"
                id="ai-job-title"
              />
            </div>

            {/* Department + Experience */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="form-select"
                  id="ai-department"
                >
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Experience Level
                </label>
                <select
                  value={expLevel}
                  onChange={(e) => setExpLevel(e.target.value)}
                  className="form-select"
                  id="ai-exp-level"
                >
                  {EXP_LEVELS.map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Work Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Work Mode
              </label>
              <PillSelect options={WORK_MODES} value={workMode} onChange={setWorkMode} />
            </div>

            {/* Raw Notes */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Raw Notes & Requirements
              </label>
              <textarea
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Paste hiring manager notes, key skills needed, specific projects they will work on..."
                className="form-textarea"
                rows={4}
                id="ai-raw-notes"
              />
            </div>
          </div>

          {/* AI Config Card */}
          <div className="glass-card p-6 space-y-5">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-700/40 pb-3">
              <Settings2 className="h-4 w-4 text-violet-400" />
              AI Configuration
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Tone of Voice
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="form-select"
                  id="ai-tone"
                >
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Focus Area
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="form-select"
                  id="ai-focus"
                >
                  {FOCUS_AREAS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && !generated && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-fade-in">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn-primary w-full flex items-center justify-center gap-2 h-14 text-base"
            id="ai-generate-btn"
          >
            {isGenerating ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Optimized JD
              </>
            )}
          </button>
        </div>

        {/* ──────────────────── RIGHT: Output Preview ────── */}
        <div className="lg:col-span-7 animate-slide-up" style={{ animationDelay: '0.12s' }}>
          <div className="glass-card flex flex-col overflow-hidden relative"
               style={{ minHeight: '680px' }}>

            {/* Card Header */}
            <div className="px-6 py-4 border-b border-slate-700/40 flex justify-between items-center bg-slate-800/30">
              <div className="flex items-center gap-2 text-indigo-400">
                <Zap className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-widest">AI Generated Preview</span>
              </div>
              {generated && (
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-ghost flex items-center gap-1.5 text-xs border border-slate-700/50 rounded-lg px-3 py-1.5"
                    id="ai-copy-btn"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-lg px-3 py-1.5 hover:bg-indigo-500/25 transition-colors cursor-pointer"
                    id="ai-save-btn"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Generated Content */}
            <div className="p-8 overflow-y-auto flex-1 pb-28 space-y-6">
              {!generated && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center py-20 space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400/60">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-400">No output yet</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-xs">
                      Fill in the role details and click "Generate Optimized JD" to see your AI-crafted job description here.
                    </p>
                  </div>
                </div>
              )}

              {isGenerating && (
                <div className="flex flex-col items-center justify-center h-full py-20 space-y-5">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-indigo-400 animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500/20 animate-ping" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Crafting your JD...</p>
                    <p className="text-sm text-slate-400 mt-1">AI is analyzing parameters and generating content</p>
                  </div>
                  {/* Skeleton lines */}
                  <div className="w-full max-w-md space-y-3 mt-4">
                    {[80, 95, 60, 90, 45].map((w, i) => (
                      <div key={i} className="skeleton-pulse h-3 rounded-full" style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}

              {generated && !isGenerating && (
                <div className="animate-fade-in space-y-6">
                  {/* Title */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{generated.title}</h2>
                    <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {department}</span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {workMode}</span>
                      <span className="text-slate-700">•</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {expLevel}</span>
                    </div>
                  </div>

                  {/* About */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">About the Role</h4>
                    <p className="text-sm text-slate-300 leading-relaxed">{generated.about}</p>
                  </div>

                  {/* Tasks */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">What You'll Do</h4>
                    <ul className="space-y-2">
                      {generated.tasks.map((task, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Requirements</h4>
                    <ul className="space-y-2">
                      {generated.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Refinement Input (floating) */}
            {generated && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[rgba(15,23,42,0.98)] via-[rgba(15,23,42,0.95)] to-transparent pt-14">
                {error && (
                  <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{error}</span>
                    <button onClick={() => setError('')} className="ml-auto text-amber-400/60 hover:text-amber-300 cursor-pointer shrink-0">✕</button>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/70 backdrop-blur-md px-3 py-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-lg shadow-black/30">
                  {isRefining ? (
                    <Loader2 className="h-4 w-4 text-indigo-400 flex-shrink-0 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  )}
                  <input
                    type="text"
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    placeholder={isRefining ? 'Refining...' : "Ask AI to adjust... (e.g. 'Add a benefits section')"}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-500"
                    id="ai-refine-input"
                    disabled={isRefining}
                    onKeyDown={(e) => { if (e.key === 'Enter' && refineText.trim() && !isRefining) handleRefine() }}
                  />
                  <button
                    onClick={handleRefine}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors cursor-pointer flex-shrink-0 disabled:opacity-40"
                    disabled={!refineText.trim() || isRefining}
                    id="ai-refine-btn"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* API Key Setup Banner */}
      {error && error.includes('API key') && (
        <div className="glass-card p-5 border-amber-500/20 animate-fade-in">
          <h4 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Setup Required
          </h4>
          <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside">
            <li>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-indigo-400 hover:text-indigo-300 underline">aistudio.google.com/apikey</a> and create a free API key</li>
            <li>Open <code className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">backend/.env</code> file</li>
            <li>Set <code className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">GEMINI_API_KEY=your_key_here</code></li>
            <li>Restart the backend server</li>
          </ol>
        </div>
      )}
    </div>
  )
}
