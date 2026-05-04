import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { FileText, User, Mail, Phone, Linkedin, Github, Briefcase, GraduationCap, Tag, Award, FolderKanban, Download, Eye, Pencil, Plus, X, ChevronDown, Save, CheckCircle2, Upload, Loader2, FilePlus2, RefreshCw } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import useStore from '../store'
import { extractResume } from '../services/api'

const TEMPLATES = [
  { id: 'modern', name: 'Modern', color: '#6366f1' },
  { id: 'classic', name: 'Classic', color: '#0f766e' },
  { id: 'minimal', name: 'Minimal', color: '#334155' },
]

const EMPTY_DATA = {
  name: '', email: '', phone: '', linkedin: '', github: '',
  role: '', summary: '', skills: [], education: '', experience: 0,
  projects: '', certifications: '',
}

function SectionHeader({ icon: Icon, title, color = 'indigo' }) {
  const colors = { indigo: 'text-indigo-400 bg-indigo-500/15', emerald: 'text-emerald-400 bg-emerald-500/15', sky: 'text-sky-400 bg-sky-500/15', violet: 'text-violet-400 bg-violet-500/15' }
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${colors[color]}`}><Icon className="h-3.5 w-3.5" /></div>
      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function EditableField({ value, onChange, placeholder, multiline = false, className = '' }) {
  if (multiline) return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`form-textarea min-h-[60px] text-sm ${className}`} />
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`form-input text-sm ${className}`} />
}

function SkillBadge({ skill, onRemove }) {
  return (
    <span className="tag-pill">
      {skill}
      <button onClick={onRemove} className="tag-pill-remove">×</button>
    </span>
  )
}

// ── Resume Preview (right panel) ──
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '99, 102, 241'
}

function ResumePreview({ data, template }) {
  const accent = TEMPLATES.find(t => t.id === template)?.color || '#6366f1'
  const accentRgb = hexToRgb(accent)
  const { name, email, phone, linkedin, github, role, summary, skills, education, experience, projects, certifications } = data

  // Ensure skills is always an array
  const skillsArr = Array.isArray(skills)
    ? skills
    : typeof skills === 'string' && skills.length > 0
      ? skills.split(/[,|;]+/).map(s => s.trim()).filter(Boolean)
      : []

  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '700px', wordBreak: 'break-word', overflowWrap: 'anywhere' }} id="resume-preview">
      {/* Header */}
      <div className="px-8 py-6" style={{ background: accent }}>
        <h1 className="text-2xl font-bold text-white">{name || 'Your Name'}</h1>
        {role && <p className="text-white/80 text-sm mt-1">{role}</p>}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-white/70">
          {email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{email}</span>}
          {phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{phone}</span>}
          {linkedin && <span className="flex items-center gap-1"><Linkedin className="h-3 w-3" />{linkedin.replace('https://', '')}</span>}
          {github && <span className="flex items-center gap-1"><Github className="h-3 w-3" />{github.replace('https://', '')}</span>}
        </div>
      </div>

      <div className="px-8 py-6 space-y-5 text-sm">
        {/* Summary */}
        {summary && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Professional Summary</h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Skills */}
        {skillsArr.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skillsArr.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: `rgba(${accentRgb}, 0.1)`, color: accent, border: `1px solid rgba(${accentRgb}, 0.25)` }}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {experience > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Experience</h2>
            <p className="text-gray-700">{experience} year{experience !== 1 ? 's' : ''} of professional experience</p>
          </div>
        )}

        {/* Education */}
        {education && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Education</h2>
            <p className="text-gray-700">{education}</p>
          </div>
        )}

        {/* Projects */}
        {projects && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Projects</h2>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed" style={{ overflowWrap: 'anywhere' }}>{projects}</p>
          </div>
        )}

        {/* Certifications */}
        {certifications && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Certifications</h2>
            <p className="text-gray-700 whitespace-pre-line" style={{ overflowWrap: 'anywhere' }}>{certifications}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Entry Modal ──
function ResumeEntryModal({ onEdit, onFresh, isExtracting }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleFile = (f) => {
    setError('')
    const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowed.includes(f.type)) { setError('Only PDF or DOCX files'); return }
    if (f.size > 10 * 1024 * 1024) { setError('Max 10 MB'); return }
    setFile(f)
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6 animate-slide-up">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
            <FileText className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            Resume <span className="gradient-text">Builder</span>
          </h1>
          <p className="text-sm text-slate-400">Choose how you'd like to start</p>
        </div>

        {/* Upload & Edit option */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-400" />
            Upload Existing Resume
          </h3>
          <p className="text-xs text-slate-400">Upload your resume (PDF/DOCX) and we'll extract your data using AI-powered parsing so you can edit and improve it.</p>

          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3">
              <FileText className="h-5 w-5 text-sky-400 shrink-0" />
              <span className="text-sm text-white truncate flex-1">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-slate-500 hover:text-red-400 cursor-pointer bg-transparent border-none"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-slate-700/60 p-6 text-center hover:border-indigo-500/40 cursor-pointer transition-colors bg-transparent"
            >
              <Upload className="h-5 w-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Click to upload resume</p>
              <p className="text-xs text-slate-500 mt-1">PDF or DOCX, up to 10 MB</p>
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
            </button>
          )}

          {error && <p className="text-xs text-red-400 flex items-center gap-1"><X className="h-3 w-3" />{error}</p>}

          <button
            onClick={() => file && onEdit(file)}
            disabled={!file || isExtracting}
            className="btn-primary w-full flex items-center justify-center gap-2 h-12"
            id="resume-entry-edit-btn"
          >
            {isExtracting ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Extracting resume data…</>
            ) : (
              <><Pencil className="h-4 w-4" />Edit Existing Resume</>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-700/50" />
          <span className="text-xs font-bold text-slate-500 tracking-wider">OR</span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>

        {/* Start fresh option */}
        <button
          onClick={onFresh}
          disabled={isExtracting}
          className="glass-card-hover w-full p-6 text-left space-y-2 cursor-pointer ring-1 ring-transparent hover:ring-emerald-500/30 transition-all"
          id="resume-entry-fresh-btn"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FilePlus2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Start Fresh</h3>
              <p className="text-xs text-slate-400">Create a new resume from scratch</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──
export default function ResumeBuildPage() {
  const resumeBuildData = useStore(s => s.resumeBuildData)
  const setResumeBuildData = useStore(s => s.setResumeBuildData)
  const user = useStore(s => s.user)
  const location = useLocation()

  // Determine if user has existing data (only when logged in)
  const hasExistingData = user && resumeBuildData && Object.values(resumeBuildData).some(
    v => v && (typeof v === 'string' ? v.trim() : Array.isArray(v) ? v.length > 0 : v > 0)
  )

  // Phase: 'entry' (modal) | 'editor' (main editor)
  const [phase, setPhase] = useState(() => {
    // If navigated with state (from another page), skip the modal
    if (location.state?.mode === 'edit' || location.state?.mode === 'new') return 'editor'
    // If logged in and has data, go straight to editor
    if (hasExistingData) return 'editor'
    return 'entry'
  })

  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')

  // Only load stored data if logged in
  const stored = user ? (resumeBuildData || JSON.parse(localStorage.getItem('rs_resume_build') || 'null')) : null

  const [template, setTemplate] = useState('modern')
  const [showPreview, setShowPreview] = useState(false)
  const [addSkill, setAddSkill] = useState('')
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const saveTimerRef = useRef(null)

  const [data, setData] = useState(() => {
    if (location.state?.data) return { ...EMPTY_DATA, ...location.state.data }
    if (stored) return { ...EMPTY_DATA, ...stored }
    return { ...EMPTY_DATA }
  })

  // If user logs out while on this page, reset to entry
  useEffect(() => {
    if (!user) {
      setData({ ...EMPTY_DATA })
      setPhase('entry')
    }
  }, [user])

  // Auto-save with 1s debounce
  const scheduleSave = useCallback((newData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('saving')
    saveTimerRef.current = setTimeout(() => {
      setResumeBuildData(newData)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 1000)
  }, [setResumeBuildData])

  const update = (field, value) => {
    setData(prev => {
      const next = { ...prev, [field]: value }
      scheduleSave(next)
      return next
    })
  }

  const handleAddSkill = () => {
    const s = addSkill.trim()
    if (s && !data.skills.includes(s)) {
      update('skills', [...data.skills, s])
    }
    setAddSkill('')
  }

  const handleRemoveSkill = (skill) => {
    update('skills', data.skills.filter(s => s !== skill))
  }

  const handleDownload = () => {
    const el = document.getElementById('resume-preview')
    if (!el) return
    
    // Create a wrapper to enforce A4/Letter size exactly for the PDF
    const wrapper = document.createElement('div');
    wrapper.style.width = '800px'; 
    wrapper.style.backgroundColor = 'white';
    wrapper.innerHTML = el.innerHTML;
    // Hide rounded corners and shadows for the print version
    wrapper.style.borderRadius = '0px';
    wrapper.style.boxShadow = 'none';
    wrapper.style.color = '#111827';
    document.body.appendChild(wrapper);

    const opt = {
      margin:       0,
      filename:     `${data.name || 'Resume'}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
      jsPDF:        { unit: 'px', format: [800, wrapper.scrollHeight || 1131], orientation: 'portrait' }
    };

    html2pdf().from(wrapper).set(opt).save().then(() => {
      document.body.removeChild(wrapper);
    });
  }

  // Handle "Edit Existing Resume" from the entry modal
  const handleEditExisting = async (file) => {
    setIsExtracting(true)
    setExtractError('')
    try {
      const result = await extractResume(file)
      if (result.parsed) {
        const parsed = result.parsed
        setData({
          name: parsed.name || '',
          email: parsed.email || '',
          phone: parsed.phone || '',
          linkedin: parsed.linkedin || '',
          github: parsed.github || '',
          role: parsed.role || '',
          summary: parsed.summary || '',
          skills: parsed.skills || [],
          education: parsed.education || '',
          experience: parsed.experience || 0,
          projects: parsed.projects || '',
          certifications: parsed.certifications || '',
        })
      }
      setPhase('editor')
    } catch (err) {
      setExtractError(err.response?.data?.detail || 'Failed to extract resume. Please try again.')
    } finally {
      setIsExtracting(false)
    }
  }

  // Handle "Start Fresh" from the entry modal
  const handleStartFresh = () => {
    setData({ ...EMPTY_DATA })
    setPhase('editor')
  }

  // ── ENTRY MODAL PHASE ──
  if (phase === 'entry') {
    return (
      <>
        <ResumeEntryModal
          onEdit={handleEditExisting}
          onFresh={handleStartFresh}
          isExtracting={isExtracting}
        />
        {extractError && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm shadow-lg">
              <X className="h-4 w-4 shrink-0" />
              <span>{extractError}</span>
              <button onClick={() => setExtractError('')} className="ml-2 text-red-400/60 hover:text-red-300 cursor-pointer bg-transparent border-none">✕</button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── EDITOR PHASE ──
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      {/* ── Left: Editor Panel ── */}
      <div className="w-full lg:w-[420px] xl:w-[480px] flex-shrink-0 border-r border-slate-700/40 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="p-5 space-y-5">
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400"><FileText className="h-4 w-4" /></div>
              <div>
                <p className="text-sm font-bold text-white">Resume Builder</p>
                <div className="flex items-center gap-2">
                  <p className="text-[11px] text-slate-400">Edit and preview your resume</p>
                  {saveStatus === 'saving' && <span className="text-[10px] text-amber-400 flex items-center gap-1"><Save className="h-3 w-3 animate-pulse" />Saving…</span>}
                  {saveStatus === 'saved' && <span className="text-[10px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Saved{user ? ' to cloud' : ''}</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPhase('entry')} className="btn-ghost flex items-center gap-1.5 text-xs" id="resume-back-entry-btn">
                <RefreshCw className="h-3.5 w-3.5" />New
              </button>
              <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost flex items-center gap-1.5 text-xs lg:hidden" id="toggle-preview-btn">
                {showPreview ? <><Pencil className="h-3.5 w-3.5" />Edit</> : <><Eye className="h-3.5 w-3.5" />Preview</>}
              </button>
              <button onClick={handleDownload} className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs" id="download-resume-btn">
                <Download className="h-3.5 w-3.5" />Download
              </button>
            </div>
          </div>

          {/* Template selector */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Template</p>
            <div className="flex gap-2">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border cursor-pointer transition-all ${template === t.id ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300' : 'border-slate-700/50 bg-transparent text-slate-400 hover:bg-white/5'}`}>
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Personal Info */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={User} title="Personal Info" />
            <div className="grid grid-cols-2 gap-2">
              <EditableField value={data.name} onChange={v => update('name', v)} placeholder="Full Name" />
              <EditableField value={data.role} onChange={v => update('role', v)} placeholder="Job Title" />
              <EditableField value={data.email} onChange={v => update('email', v)} placeholder="Email" />
              <EditableField value={data.phone} onChange={v => update('phone', v)} placeholder="Phone" />
              <EditableField value={data.linkedin} onChange={v => update('linkedin', v)} placeholder="LinkedIn URL" />
              <EditableField value={data.github} onChange={v => update('github', v)} placeholder="GitHub URL" />
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={FileText} title="Summary" color="violet" />
            <EditableField value={data.summary} onChange={v => update('summary', v)} placeholder="Professional summary..." multiline />
          </div>

          {/* Skills */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={Tag} title="Skills" color="emerald" />
            <div className="flex flex-wrap gap-1.5">
              {data.skills.map(s => <SkillBadge key={s} skill={s} onRemove={() => handleRemoveSkill(s)} />)}
            </div>
            <div className="flex gap-2">
              <input type="text" value={addSkill} onChange={e => setAddSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                placeholder="Add skill..." className="form-input text-sm flex-1" id="add-skill-input" />
              <button onClick={handleAddSkill} className="btn-ghost flex items-center gap-1 text-xs"><Plus className="h-3.5 w-3.5" />Add</button>
            </div>
          </div>

          {/* Education & Experience */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={GraduationCap} title="Education & Experience" color="sky" />
            <EditableField value={data.education} onChange={v => update('education', v)} placeholder="e.g. B.Tech Computer Science, MIT" />
            <div>
              <p className="text-xs text-slate-400 mb-1">Years of Experience: <span className="text-indigo-400 font-semibold">{data.experience}y</span></p>
              <input type="range" min={0} max={20} value={data.experience} onChange={e => update('experience', Number(e.target.value))} className="form-range w-full" />
            </div>
          </div>

          {/* Projects */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={FolderKanban} title="Projects" />
            <EditableField value={data.projects} onChange={v => update('projects', v)} placeholder="Describe your key projects..." multiline />
          </div>

          {/* Certifications */}
          <div className="glass-card p-4 space-y-3">
            <SectionHeader icon={Award} title="Certifications" color="emerald" />
            <EditableField value={data.certifications} onChange={v => update('certifications', v)} placeholder="List certifications..." multiline />
          </div>
        </div>
      </div>

      {/* ── Right: Preview Panel ── */}
      <div className={`flex-1 overflow-y-auto bg-slate-800/30 p-6 ${showPreview ? '' : 'hidden lg:block'}`} style={{ maxHeight: 'calc(100vh - 64px)' }}>
        <div className="max-w-[640px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500"><Eye className="h-3.5 w-3.5 inline mr-1.5" />Live Preview</p>
            <button onClick={handleDownload} className="btn-ghost flex items-center gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Download PDF</button>
          </div>
          <ResumePreview data={data} template={template} />
        </div>
      </div>
    </div>
  )
}
