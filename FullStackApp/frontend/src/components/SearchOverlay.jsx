import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, ArrowRight, Cpu, Users, FileEdit, Wand2, UploadCloud, Columns, BarChart3, Home, User, FileText, Sparkles } from 'lucide-react'

const PAGES = [
  { path: '/', label: 'Home', desc: 'Landing page', icon: Home, keywords: ['home', 'start', 'landing', 'main'] },
  { path: '/candidate', label: 'Candidate Analysis', desc: 'Upload & analyze your resume', icon: Cpu, keywords: ['candidate', 'upload', 'resume', 'analyze', 'scan', 'pdf', 'docx', 'parse'] },
  { path: '/recruiter', label: 'Recruiter Dashboard', desc: 'View ranked candidates', icon: Users, keywords: ['recruiter', 'dashboard', 'rank', 'hire', 'candidates', 'filter'] },
  { path: '/resume-build', label: 'Resume Builder', desc: 'Build resume from parsed data', icon: FileEdit, keywords: ['resume', 'build', 'create', 'editor', 'write', 'template'] },
  { path: '/ai-generator', label: 'AI Job Description Generator', desc: 'Generate JDs with AI', icon: Wand2, keywords: ['ai', 'generate', 'job', 'description', 'jd', 'gemini', 'groq'] },
  { path: '/bulk-upload', label: 'Bulk Upload', desc: 'Process up to 50 resumes', icon: UploadCloud, keywords: ['bulk', 'batch', 'multiple', 'upload', 'mass'] },
  { path: '/compare', label: 'Compare Candidates', desc: 'Side-by-side comparison', icon: Columns, keywords: ['compare', 'side', 'versus', 'vs', 'comparison'] },
  { path: '/advanced', label: 'Advanced AI', desc: 'Semantic matching & bias check', icon: Sparkles, keywords: ['advanced', 'semantic', 'bias', 'shap', 'explain', 'language'] },
  { path: '/profile', label: 'Profile & Settings', desc: 'Account settings', icon: User, keywords: ['profile', 'settings', 'account', 'password', 'email'] },
  { path: '/about', label: 'About', desc: 'About ResumeScanner', icon: FileText, keywords: ['about', 'info', 'information'] },
  { path: '/docs', label: 'Documentation', desc: 'API docs & guides', icon: FileText, keywords: ['docs', 'documentation', 'api', 'guide', 'help'] },
]

const ACTIONS = [
  { id: 'upload', label: 'Upload a Resume', desc: 'PDF or DOCX', icon: UploadCloud, path: '/candidate', keywords: ['upload', 'resume', 'pdf', 'docx', 'file'] },
  { id: 'match', label: 'Match Resume to Job', desc: 'Get match score', icon: BarChart3, path: '/candidate', keywords: ['match', 'score', 'job', 'fit', 'similarity'] },
  { id: 'ats', label: 'Check ATS Compatibility', desc: 'ATS score & issues', icon: FileText, path: '/candidate', keywords: ['ats', 'compatibility', 'applicant', 'tracking'] },
  { id: 'generate', label: 'Generate Job Description', desc: 'ML-Powered JD', icon: Wand2, path: '/ai-generator', keywords: ['generate', 'create', 'job', 'description', 'ai'] },
  { id: 'compare', label: 'Compare Candidates', desc: 'Side by side', icon: Columns, path: '/compare', keywords: ['compare', 'candidates', 'side'] },
  { id: 'bulk', label: 'Bulk Process Resumes', desc: 'Up to 50 files', icon: UploadCloud, path: '/bulk-upload', keywords: ['bulk', 'batch', 'process', 'many'] },
]

export default function SearchOverlay({ isOpen, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleNavigate = useCallback((path) => {
    navigate(path)
    onClose()
  }, [navigate, onClose])

  if (!isOpen) return null

  const q = query.toLowerCase().trim()

  const filteredPages = q
    ? PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    )
    : PAGES.slice(0, 6)

  const filteredActions = q
    ? ACTIONS.filter(a =>
      a.label.toLowerCase().includes(q) ||
      a.desc.toLowerCase().includes(q) ||
      a.keywords.some(k => k.includes(q))
    )
    : ACTIONS.slice(0, 4)

  const hasResults = filteredPages.length > 0 || filteredActions.length > 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Search Panel */}
      <div
        className="relative w-full max-w-xl animate-slide-up"
        style={{ animationDuration: '0.2s' }}
      >
        <div className="glass-card overflow-hidden shadow-2xl shadow-black/50" style={{ borderRadius: 20 }}>
          {/* Search Input */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800/50">
            <Search className="h-5 w-5 text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, actions, features..."
              className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder:text-slate-500 font-medium"
              id="global-search-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredPages.length > 0) {
                  handleNavigate(filteredPages[0].path)
                }
              }}
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-medium text-slate-400">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="sm:hidden p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar py-2">
            {!hasResults && q && (
              <div className="py-10 text-center">
                <p className="text-slate-500 text-sm">No results for "<span className="text-slate-300">{query}</span>"</p>
              </div>
            )}

            {/* Actions Section */}
            {filteredActions.length > 0 && (
              <div>
                <p className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Quick Actions
                </p>
                {filteredActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleNavigate(action.path)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer bg-transparent border-none group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{action.label}</p>
                        <p className="text-xs text-slate-500 truncate">{action.desc}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Pages Section */}
            {filteredPages.length > 0 && (
              <div>
                <p className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-1">
                  Pages
                </p>
                {filteredPages.map((page) => {
                  const Icon = page.icon
                  return (
                    <button
                      key={page.path}
                      onClick={() => handleNavigate(page.path)}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-white/[0.04] transition-colors cursor-pointer bg-transparent border-none group"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80 text-slate-400 flex-shrink-0 group-hover:bg-slate-700/80 group-hover:text-slate-300 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{page.label}</p>
                        <p className="text-xs text-slate-500 truncate">{page.desc}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-slate-800/50 flex items-center justify-between">
            <span className="text-[10px] text-slate-600">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 font-mono">↵</kbd> to select
            </span>
            <span className="text-[10px] text-slate-600">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-500 font-mono">Ctrl+K</kbd> to search
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
