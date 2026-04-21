import { useEffect } from 'react'
import {
  Upload, Pencil, Briefcase, Target,
  ArrowRight, ArrowLeft, Loader2, AlertCircle,
  CheckCircle, RotateCcw, Sparkles
} from 'lucide-react'
import DropZone             from '../components/DropZone'
import ParsedResumeEditor   from '../components/ParsedResumeEditor'
import JobConfigPanel       from '../components/JobConfigPanel'
import MatchResultCard      from '../components/MatchResultCard'
import JobRecommendationCard from '../components/JobRecommendationCard'
import { useMatch }         from '../hooks/useMatch'
import { useCategories }    from '../hooks/useCategories'
import useStore             from '../store'

// ── Step config ────────────────────────────────────────────
const STEPS = [
  { n: 1, label: 'Upload',   icon: Upload   },
  { n: 2, label: 'Edit',     icon: Pencil   },
  { n: 3, label: 'Job',      icon: Briefcase },
  { n: 4, label: 'Results',  icon: Target   },
]

function StepIndicator({ step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, idx) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`step-dot ${
              step === s.n ? 'active' :
              step > s.n  ? 'done'   :
              'pending'
            }`}>
              {step > s.n ? <CheckCircle className="h-4 w-4" /> : s.n}
            </div>
            <span className={`hidden sm:block text-[10px] font-medium tracking-wide ${
              step >= s.n ? 'text-slate-300' : 'text-slate-600'
            }`}>
              {s.label}
            </span>
          </div>

          {idx < STEPS.length - 1 && (
            <div className={`step-line mx-2 mb-4 ${step > s.n ? 'done' : ''}`}
              style={{ width: '40px' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Derive a simple parsed resume from extracted text ────────
function extractResumeFields(text = '') {
  // Heuristic name extraction (first non-empty line ≤ 40 chars that looks like a name)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const nameLine = lines.find((l) => l.length <= 40 && /^[A-Za-z ,.'-]{2,}$/.test(l)) || ''

  // Education keywords
  const edu = lines.find((l) =>
    /b\.?s\.?c|b\.?e\.?|b\.?tech|m\.?s\.?c|m\.?tech|bachelor|master|phd|degree|diploma|engineer/i.test(l)
  ) || ''

  // Experience years (look for "X years" / "X+ years")
  const expMatch = text.match(/(\d+)\s*\+?\s*years?/i)
  const experience = expMatch ? Math.min(parseInt(expMatch[1]), 20) : 0

  // Skills from common keywords in text (top N found)
  const skillKeywords = [
    'python','java','javascript','react','node','angular','vue','typescript',
    'sql','mysql','postgresql','mongodb','redis','aws','azure','gcp','docker',
    'kubernetes','git','linux','machine learning','deep learning','tensorflow',
    'pytorch','scikit-learn','pandas','numpy','flask','django','fastapi',
    'spring','c++','c#','php','ruby','matlab','r','excel','tableau','power bi',
    'html','css','rest','api','microservices','agile','scrum',
  ]
  const lowerText = text.toLowerCase()
  const skills = skillKeywords.filter((k) => lowerText.includes(k))

  return {
    name: nameLine,
    skills,
    education: edu,
    experience,
    role: '',
  }
}

// ── Job recommendations from categories + match score ───────
function buildRecommendations(categories = [], matchResult, parsedResume) {
  if (!categories.length) return []

  const baseScore = matchResult?.matchScore ?? 0
  const category  = matchResult?.category   ?? ''

  return categories
    .map((cat) => {
      // Boost the predicted category, reduce others
      let score = Math.round(baseScore * (cat === category ? 1 : 0.55 + Math.random() * 0.3))
      score = Math.min(score, 98)
      return { title: cat, matchPct: score, skills: matchResult?.resumeTopTerms?.slice(0, 6) ?? [] }
    })
    .sort((a, b) => b.matchPct - a.matchPct)
    .slice(0, 6)
}

// ── Page ────────────────────────────────────────────────────
export default function CandidatePage() {
  const resumeText    = useStore((s) => s.resumeText)
  const resumeFile    = useStore((s) => s.resumeFile)
  const parsedResume  = useStore((s) => s.parsedResume)
  const setParsedResume = useStore((s) => s.setParsedResume)
  const jobConfig     = useStore((s) => s.jobConfig)
  const matchResult   = useStore((s) => s.matchResult)
  const isAnalyzing   = useStore((s) => s.isAnalyzing)
  const step          = useStore((s) => s.step)
  const nextStep      = useStore((s) => s.nextStep)
  const prevStep      = useStore((s) => s.prevStep)
  const setStep       = useStore((s) => s.setStep)
  const clearAnalysis = useStore((s) => s.clearAnalysis)

  const { mutate: runMatch, isError, error } = useMatch()
  const { data: categories = [] }            = useCategories()

  // Auto-parse resume when text becomes available
  useEffect(() => {
    if (resumeText && !parsedResume) {
      setParsedResume(extractResumeFields(resumeText))
    }
  }, [resumeText, parsedResume, setParsedResume])

  const handleMatch = () => {
    if (!resumeText) return
    const jd = jobConfig.jdText || jobConfig.requiredSkills.join(' ')
    runMatch({ resumeText, jobDescription: jd })
  }

  const recommendations = buildRecommendations(categories, matchResult, parsedResume)

  // ── Render steps ──────────────────────────────────────────
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-3xl mx-auto space-y-6">

      {/* Title */}
      <div className="text-center space-y-2 animate-slide-up">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Candidate <span className="gradient-text">Workspace</span>
        </h1>
        <p className="text-sm text-slate-400">Upload your resume and find your best-fit roles</p>
      </div>

      {/* Step Indicator */}
      <StepIndicator step={step} />

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <div className="glass-card p-6 sm:p-8 space-y-6 animate-fade-in">
          <DropZone />

          {isError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error?.response?.data?.detail || 'Backend API unavailable.'}</p>
            </div>
          )}

          <button
            onClick={nextStep}
            disabled={!resumeFile || !resumeText}
            className="btn-primary flex h-12 w-full items-center justify-center gap-2"
            id="step1-next-btn"
          >
            Continue to Edit
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Step 2: Edit parsed resume ── */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          {parsedResume ? (
            <ParsedResumeEditor />
          ) : (
            <div className="glass-card p-8 text-center text-slate-400 text-sm">
              Parsing resume… please wait.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={prevStep} className="btn-secondary flex items-center gap-2 flex-1 justify-center" id="step2-back-btn">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={nextStep} disabled={!parsedResume}
              className="btn-primary flex items-center gap-2 flex-1 justify-center" id="step2-next-btn"
            >
              Add Job Description <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Job Config ── */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <JobConfigPanel />

          {isError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error?.response?.data?.detail || 'Backend API unavailable.'}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={prevStep} className="btn-secondary flex items-center gap-2 flex-1 justify-center" id="step3-back-btn">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={() => { handleMatch(); nextStep() }}
              disabled={isAnalyzing}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
              id="match-resume-btn"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Matching…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Match Resume</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Results ── */}
      {step === 4 && (
        <div className="space-y-6 animate-fade-in">
          {isAnalyzing ? (
            <div className="glass-card p-12 flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
              <p className="text-slate-300 font-medium">Analyzing your resume…</p>
              <p className="text-sm text-slate-500">Running ML matching pipeline</p>
            </div>
          ) : matchResult ? (
            <>
              <MatchResultCard result={matchResult} />

              {/* Job Recommendations */}
              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                    <h2 className="text-base font-semibold text-white">Job Recommendations</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recommendations.map((rec, i) => (
                      <JobRecommendationCard
                        key={rec.title}
                        title={rec.title}
                        matchPct={rec.matchPct}
                        skills={rec.skills}
                        rank={i + 1}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => { clearAnalysis(); setStep(1) }}
                  className="btn-secondary flex items-center gap-2"
                  id="analyze-another-btn"
                >
                  <RotateCcw className="h-4 w-4" />
                  Analyze Another Resume
                </button>
              </div>
            </>
          ) : (
            <div className="glass-card p-10 text-center space-y-3">
              <p className="text-slate-300">No results yet.</p>
              <button onClick={() => setStep(3)} className="btn-secondary" id="go-back-match-btn">
                Go back and match
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
