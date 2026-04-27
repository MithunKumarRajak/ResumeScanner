import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload, FileText, X, AlertCircle, ChevronDown, Sparkles,
  ClipboardCheck, GitCompare, FileEdit, BarChart3, ArrowLeft,
  Loader2, CheckCircle2, AlertTriangle
} from 'lucide-react'
import MatchResultCard from '../components/MatchResultCard'
import ParsedResumeEditor from '../components/ParsedResumeEditor'
import { useMatch } from '../hooks/useMatch'
import useStore from '../store'

const ALLOWED = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 5 * 1024 * 1024
const MODELS = [
  { id: 'ResumeModel_v2', name: 'Model v2 (Base)', desc: 'KNN + OneVsRest classifier' },
  { id: 'ResumeModel_v3', name: 'Model v3 (New ✨)', desc: 'Enhanced Linear SVM pipeline' },
]
const ACTIONS = [
  { id: 'checker', icon: ClipboardCheck, title: 'Resume Checker', sub: 'with AI Feedback', color: 'indigo', needs: 'resume' },
  { id: 'match', icon: GitCompare, title: 'Resume Match', sub: 'with Job Description', color: 'violet', needs: 'both' },
  { id: 'edit', icon: FileEdit, title: 'Resume Edit', sub: 'with parsed data', color: 'sky', needs: 'resume' },
  { id: 'scores', icon: BarChart3, title: 'Job Match Scores', sub: 'Detailed scoring breakdown', color: 'emerald', needs: 'both' },
]

function MiniDropZone({ file, onFile, onClear }) {
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef(null)
  const handle = useCallback((f) => {
    setError('')
    if (!ALLOWED.includes(f.type)) { setError('Only PDF / DOCX'); return }
    if (f.size > MAX_SIZE) { setError('Max 5 MB'); return }
    onFile(f)
  }, [onFile])

  if (file) return (
    <div className="glass-card flex items-center justify-between p-4 animate-fade-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400"><FileText className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{file.name}</p>
          <p className="text-xs text-slate-400">{(file.size/1024).toFixed(1)} KB</p>
        </div>
      </div>
      <button onClick={onClear} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 cursor-pointer hover:text-red-400 transition-colors"><X className="h-4 w-4" /></button>
    </div>
  )

  return (
    <div className="space-y-2">
      <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
        onDrop={e=>{e.preventDefault();setDrag(false);e.dataTransfer.files?.[0]&&handle(e.dataTransfer.files[0])}}
        onClick={()=>ref.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${drag?'dropzone-active':'border-slate-700/60 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]'}`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4"><Upload className="h-6 w-6" /></div>
        <p className="text-sm font-medium text-slate-300">Drop your resume here or <span className="text-indigo-400">browse</span></p>
        <p className="text-xs text-slate-500 mt-1">PDF or DOCX, up to 5 MB</p>
        <input ref={ref} type="file" accept=".pdf,.docx" onChange={e=>e.target.files?.[0]&&handle(e.target.files[0])} className="hidden" id="candidate-resume-upload" />
      </div>
      {error && <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
    </div>
  )
}

function CardModelSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const cur = MODELS.find(m=>m.id===value)||MODELS[0]
  return (
    <div className="relative mt-4">
      <button onClick={()=>setOpen(!open)} className="flex w-full items-center justify-between rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-2.5 text-sm cursor-pointer transition-all hover:border-slate-600" id="candidate-model-selector">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-400" /><span className="font-medium text-slate-200">{cur.name}</span></div>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open?'rotate-180':''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-slate-700/80 bg-[rgba(15,23,42,0.97)] p-1.5 shadow-xl shadow-black/60 backdrop-blur-xl z-50 animate-fade-in">
          {MODELS.map(m=>(
            <button key={m.id} onClick={()=>{onChange(m.id);setOpen(false)}}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm cursor-pointer border-none transition-all ${value===m.id?'bg-indigo-500/15 text-indigo-300':'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <div><p className="font-semibold">{m.name}</p><p className="text-[11px] opacity-60 mt-0.5">{m.desc}</p></div>
              {value===m.id && <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MissingInputModal({ missingType, onProvide, onClose }) {
  const [file, setFile] = useState(null)
  const [text, setText] = useState('')
  const ref = useRef(null)
  const isResume = missingType === 'resume'
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card p-6 sm:p-8 space-y-5 animate-slide-up">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><AlertTriangle className="h-5 w-5" /></div>
          <div><h3 className="text-lg font-bold text-white">Missing Input Required</h3>
            <p className="text-sm text-slate-400 mt-1">This action requires {isResume?'a resume':'a job description'}. Please provide it below.</p></div>
        </div>
        {isResume ? (
          <div className="space-y-3">
            {file ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
                <FileText className="h-5 w-5 text-sky-400 shrink-0" /><span className="text-sm text-white truncate flex-1">{file.name}</span>
                <button onClick={()=>setFile(null)} className="text-slate-500 hover:text-red-400 cursor-pointer bg-transparent border-none"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button onClick={()=>ref.current?.click()} className="w-full rounded-xl border-2 border-dashed border-slate-700/60 p-6 text-center hover:border-indigo-500/40 cursor-pointer transition-colors bg-transparent">
                <Upload className="h-5 w-5 text-indigo-400 mx-auto mb-2" /><p className="text-sm text-slate-400">Click to upload resume</p>
                <input ref={ref} type="file" accept=".pdf,.docx" onChange={e=>e.target.files?.[0]&&setFile(e.target.files[0])} className="hidden" />
              </button>
            )}
          </div>
        ) : (
          <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the job description here…" className="form-textarea min-h-[140px]" id="modal-jd-input" />
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" id="modal-cancel-btn">Cancel</button>
          <button onClick={()=>onProvide(isResume?file:text)} disabled={isResume?!file:!text.trim()} className="btn-primary flex-1 flex items-center justify-center gap-2" id="modal-submit-btn">
            <CheckCircle2 className="h-4 w-4" /> Continue
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionCard({ action, onClick }) {
  const Icon = action.icon
  const colors = {
    indigo:{bg:'bg-indigo-500/12',text:'text-indigo-400',ring:'hover:ring-indigo-500/30',glow:'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]'},
    violet:{bg:'bg-violet-500/12',text:'text-violet-400',ring:'hover:ring-violet-500/30',glow:'group-hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]'},
    sky:{bg:'bg-sky-500/12',text:'text-sky-400',ring:'hover:ring-sky-500/30',glow:'group-hover:shadow-[0_0_30px_rgba(14,165,233,0.15)]'},
    emerald:{bg:'bg-emerald-500/12',text:'text-emerald-400',ring:'hover:ring-emerald-500/30',glow:'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]'},
  }
  const c = colors[action.color]
  return (
    <button onClick={onClick} className={`glass-card-hover group w-full text-left p-6 space-y-4 cursor-pointer ring-1 ring-transparent ${c.ring} ${c.glow} transition-all duration-300`} id={`action-${action.id}`}>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${c.bg} ${c.text} group-hover:scale-110 transition-transform duration-300`}><Icon className="h-6 w-6" /></div>
      <div><h3 className="text-base font-bold text-white mb-1">{action.title}</h3><p className="text-sm text-slate-400">{action.sub}</p></div>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>Select →</span>
    </button>
  )
}

// ── Extract text from uploaded file ──
async function extractFileText(file) {
  if (file.type === 'application/pdf') {
    const pdfjsLib = await import('pdfjs-dist')
    const workerModule = await import('pdfjs-dist/build/pdf.worker.min.js?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
    const url = URL.createObjectURL(file)
    try {
      const pdf = await pdfjsLib.getDocument(url).promise
      let text = ''
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(it => it.str).join(' ') + '\n'
      }
      return text.trim()
    } finally { URL.revokeObjectURL(url) }
  } else {
    const mammoth = await import('mammoth')
    const buf = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer: buf })
    return result.value.trim()
  }
}

function extractResumeFields(text = '') {
  const lines = text.split('\n').map(l=>l.trim()).filter(Boolean)
  const nameLine = lines.find(l=>l.length<=40&&/^[A-Za-z ,.'-]{2,}$/.test(l))||''
  const edu = lines.find(l=>/b\.?s\.?c|b\.?e\.?|b\.?tech|m\.?s\.?c|m\.?tech|bachelor|master|phd|degree|diploma|engineer/i.test(l))||''
  const expMatch = text.match(/(\d+)\s*\+?\s*years?/i)
  const experience = expMatch ? Math.min(parseInt(expMatch[1]),20) : 0
  const skillKeywords = ['python','java','javascript','react','node','angular','vue','typescript','sql','mysql','postgresql','mongodb','aws','azure','docker','kubernetes','git','linux','machine learning','deep learning','tensorflow','pytorch','flask','django','fastapi','c++','c#','html','css','rest','api']
  const lower = text.toLowerCase()
  const skills = skillKeywords.filter(k=>lower.includes(k))
  return { name: nameLine, skills, education: edu, experience, role: '' }
}

// ════════════════════════════════════════
// MAIN CANDIDATE PAGE
// ════════════════════════════════════════
export default function CandidatePage() {
  const selectedModel = useStore(s=>s.selectedModel)
  const setSelectedModel = useStore(s=>s.setSelectedModel)
  const storeSetResumeFile = useStore(s=>s.setResumeFile)
  const storeSetResumeText = useStore(s=>s.setResumeText)
  const storeSetJobDesc = useStore(s=>s.setJobDescription)
  const setParsedResume = useStore(s=>s.setParsedResume)
  const matchResult = useStore(s=>s.matchResult)
  const isAnalyzing = useStore(s=>s.isAnalyzing)
  const parsedResume = useStore(s=>s.parsedResume)
  const clearAnalysis = useStore(s=>s.clearAnalysis)

  const { mutate: runMatch, isError, error: matchError } = useMatch()

  const [phase, setPhase] = useState('input') // input | dashboard | result
  const [activeAction, setActiveAction] = useState(null)
  const [resumeFile, setLocalFile] = useState(null)
  const [resumeText, setResumeText] = useState('')
  const [jobDesc, setJobDesc] = useState('')
  const [processing, setProcessing] = useState(false)
  const [missingFor, setMissingFor] = useState(null)
  const [extractError, setExtractError] = useState('')

  const hasResume = !!resumeFile
  const hasJD = !!jobDesc.trim()
  const canProcess = hasResume || hasJD

  // Extract text when file is set
  const handleFileSet = useCallback(async (file) => {
    setLocalFile(file)
    setExtractError('')
    try {
      const text = await extractFileText(file)
      if (!text) { setExtractError('Could not extract text from this file.'); return }
      setResumeText(text)
      storeSetResumeFile(file)
      storeSetResumeText(text)
      setParsedResume(extractResumeFields(text))
    } catch { setExtractError('Failed to extract text.') }
  }, [storeSetResumeFile, storeSetResumeText, setParsedResume])

  const handleFileClear = () => {
    setLocalFile(null); setResumeText(''); setExtractError('')
    storeSetResumeFile(null); storeSetResumeText(''); setParsedResume(null)
  }

  const handleProcess = async () => {
    if (!canProcess) return
    setProcessing(true)
    if (jobDesc) storeSetJobDesc(jobDesc)
    await new Promise(r=>setTimeout(r,800))
    setProcessing(false)
    setPhase('dashboard')
  }

  const handleAction = (action) => {
    if (action.needs==='both'&&(!hasResume||!hasJD)) { setMissingFor(action); return }
    if (action.needs==='resume'&&!hasResume) { setMissingFor(action); return }
    setActiveAction(action.id)
    if (action.id==='match'||action.id==='scores') {
      runMatch({ resumeText, jobDescription: jobDesc })
    }
    setPhase('result')
  }

  const handleMissingProvide = async (value) => {
    if (!missingFor) return
    const needsResume = (missingFor.needs==='both'&&!hasResume)||missingFor.needs==='resume'
    if (needsResume && value) {
      await handleFileSet(value)
    } else if (value) {
      setJobDesc(value); storeSetJobDesc(value)
    }
    setMissingFor(null)
  }

  const missingType = missingFor
    ? (missingFor.needs==='both'&&!hasResume)||missingFor.needs==='resume' ? 'resume' : 'jd'
    : null

  const resetAll = () => { clearAnalysis(); setPhase('input'); setLocalFile(null); setResumeText(''); setJobDesc(''); setActiveAction(null) }

  // ── INPUT PHASE ──
  if (phase==='input') return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10 animate-slide-up">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300 tracking-wide">AI-Powered Resume Analysis</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-3">
          Scan, Match & <span className="gradient-text">Optimize</span>
        </h1>
        <p className="max-w-lg mx-auto text-sm sm:text-base text-slate-400 leading-relaxed">
          Upload your resume, paste a job description, or both — then let our AI do the heavy lifting.
        </p>
      </div>
      <div className="w-full max-w-4xl animate-slide-up" style={{animationDelay:'0.1s'}}>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0 items-stretch">
          <div className="glass-card p-6 space-y-4 rounded-b-none md:rounded-b-[20px] md:rounded-r-none">
            <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /><h2 className="text-base font-bold text-white">Resume Input</h2></div>
            <MiniDropZone file={resumeFile} onFile={handleFileSet} onClear={handleFileClear} />
            {extractError && <p className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{extractError}</p>}
            <CardModelSelector value={selectedModel} onChange={setSelectedModel} />
          </div>
          <div className="flex items-center justify-center md:flex-col py-4 md:py-0">
            <div className="flex-1 h-px md:h-auto md:w-px bg-slate-700/50 md:flex-1" />
            <span className="mx-4 md:mx-0 md:my-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/80 text-xs font-bold text-slate-400 tracking-wider">OR</span>
            <div className="flex-1 h-px md:h-auto md:w-px bg-slate-700/50 md:flex-1" />
          </div>
          <div className="glass-card p-6 space-y-4 rounded-t-none md:rounded-t-[20px] md:rounded-l-none">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-violet-400" /><h2 className="text-base font-bold text-white">Job Description</h2></div>
            <textarea value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder="Paste the full job description here…" className="form-textarea min-h-[200px]" id="candidate-jd-input" />
          </div>
        </div>
        <div className="flex justify-center mt-8 animate-slide-up" style={{animationDelay:'0.2s'}}>
          <button onClick={handleProcess} disabled={!canProcess||processing} className="btn-primary flex items-center gap-3 px-10 py-3.5 text-base" id="candidate-process-btn">
            {processing ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</> : <><Sparkles className="h-5 w-5" /> Process</>}
          </button>
        </div>
      </div>
    </div>
  )

  // ── DASHBOARD PHASE ──
  if (phase==='dashboard') return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-3xl mb-8 animate-fade-in">
        <button onClick={()=>setPhase('input')} className="btn-ghost flex items-center gap-2" id="dashboard-back-btn"><ArrowLeft className="h-4 w-4" /> Back to Input</button>
      </div>
      <div className="text-center mb-10 animate-slide-up">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-xs font-semibold text-emerald-300 tracking-wide">Processing Complete</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">Choose an <span className="gradient-text">Action</span></h1>
        <p className="text-sm text-slate-400">Select what you'd like to do with your data</p>
      </div>
      <div className="flex items-center justify-center gap-4 mb-8 animate-slide-up" style={{animationDelay:'0.05s'}}>
        {hasResume && <span className="flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-300"><FileText className="h-3 w-3" /> Resume uploaded</span>}
        {hasJD && <span className="flex items-center gap-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-300"><ClipboardCheck className="h-3 w-3" /> Job description</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl animate-slide-up" style={{animationDelay:'0.1s'}}>
        {ACTIONS.map(a => <ActionCard key={a.id} action={a} onClick={()=>handleAction(a)} />)}
      </div>
      {missingFor && <MissingInputModal missingType={missingType} onProvide={handleMissingProvide} onClose={()=>setMissingFor(null)} />}
    </div>
  )

  // ── RESULT PHASE ──
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">
      <button onClick={()=>setPhase('dashboard')} className="btn-ghost flex items-center gap-2" id="result-back-btn"><ArrowLeft className="h-4 w-4" /> Back to Actions</button>

      {(activeAction==='match'||activeAction==='scores') && (
        isAnalyzing ? (
          <div className="glass-card p-12 flex flex-col items-center gap-4"><Loader2 className="h-10 w-10 animate-spin text-indigo-400" /><p className="text-slate-300 font-medium">Analyzing your resume…</p><p className="text-sm text-slate-500">Running ML matching pipeline</p></div>
        ) : isError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{matchError?.response?.data?.detail||'Backend API unavailable.'}</p></div>
        ) : matchResult ? (
          <MatchResultCard result={matchResult} />
        ) : (
          <div className="glass-card p-10 text-center"><p className="text-slate-400">No results yet.</p></div>
        )
      )}

      {activeAction==='checker' && (
        matchResult ? <MatchResultCard result={matchResult} /> : (
          <div className="glass-card p-8 space-y-4">
            <h2 className="text-xl font-bold text-white">Resume Checker</h2>
            <p className="text-sm text-slate-400">Running AI analysis on your resume…</p>
            {!matchResult && !isAnalyzing && <button onClick={()=>runMatch({resumeText, jobDescription: jobDesc})} className="btn-primary" id="run-checker-btn"><Sparkles className="h-4 w-4 inline mr-2" />Analyze Resume</button>}
            {isAnalyzing && <div className="flex items-center gap-2 text-indigo-400"><Loader2 className="h-5 w-5 animate-spin" /><span>Analyzing…</span></div>}
            {isError && <p className="text-sm text-red-400">{matchError?.response?.data?.detail||'Backend unavailable.'}</p>}
          </div>
        )
      )}

      {activeAction==='edit' && (
        parsedResume ? <ParsedResumeEditor /> : <div className="glass-card p-10 text-center text-slate-400">No parsed resume data available.</div>
      )}

      <div className="flex justify-center pt-4">
        <button onClick={resetAll} className="btn-secondary flex items-center gap-2" id="reset-btn">Start Over</button>
      </div>
    </div>
  )
}
