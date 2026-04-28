import { useState, useRef, useEffect, useCallback } from 'react'
import { FileText, User, Mail, Phone, Linkedin, Github, Briefcase, GraduationCap, Tag, Award, FolderKanban, Download, Eye, Pencil, Plus, X, ChevronDown, Save, CheckCircle2 } from 'lucide-react'
import useStore from '../store'

const TEMPLATES = [
  { id: 'modern', name: 'Modern', color: '#6366f1' },
  { id: 'classic', name: 'Classic', color: '#0f766e' },
  { id: 'minimal', name: 'Minimal', color: '#334155' },
]

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
function ResumePreview({ data, template }) {
  const accent = TEMPLATES.find(t => t.id === template)?.color || '#6366f1'
  const { name, email, phone, linkedin, github, role, summary, skills, education, experience, projects, certifications } = data

  return (
    <div className="bg-white text-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={{ minHeight: '700px' }} id="resume-preview">
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
        {skills?.length > 0 && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map(s => (
                <span key={s} className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}30` }}>{s}</span>
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
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">{projects}</p>
          </div>
        )}

        {/* Certifications */}
        {certifications && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>Certifications</h2>
            <p className="text-gray-700 whitespace-pre-line">{certifications}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ──
export default function ResumeBuildPage() {
  const resumeBuildData = useStore(s => s.resumeBuildData)
  const setResumeBuildData = useStore(s => s.setResumeBuildData)
  const user = useStore(s => s.user)
  const stored = resumeBuildData || JSON.parse(localStorage.getItem('rs_resume_build') || 'null')

  const [template, setTemplate] = useState('modern')
  const [showPreview, setShowPreview] = useState(false)
  const [addSkill, setAddSkill] = useState('')
  const [saveStatus, setSaveStatus] = useState('') // '' | 'saving' | 'saved'
  const saveTimerRef = useRef(null)

  const [data, setData] = useState({
    name: stored?.name || '',
    email: stored?.email || '',
    phone: stored?.phone || '',
    linkedin: stored?.linkedin || '',
    github: stored?.github || '',
    role: stored?.role || '',
    summary: stored?.summary || '',
    skills: stored?.skills || [],
    education: stored?.education || '',
    experience: stored?.experience || 0,
    projects: stored?.projects || '',
    certifications: stored?.certifications || '',
  })

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
    const printWin = window.open('', '_blank')
    printWin.document.write(`<!DOCTYPE html><html><head><title>${data.name || 'Resume'}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',system-ui,sans-serif}body{background:#fff}
      .header{padding:32px;color:#fff}.content{padding:32px}h1{font-size:24px;font-weight:700}
      h2{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
      p{font-size:13px;line-height:1.6;color:#374151}.section{margin-bottom:20px}
      .badge{display:inline-block;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:500;margin:2px}
      .contact{display:flex;gap:16px;font-size:11px;margin-top:12px;opacity:0.8;flex-wrap:wrap}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body>`)
    printWin.document.write(el.innerHTML)
    printWin.document.write('</body></html>')
    printWin.document.close()
    setTimeout(() => { printWin.print() }, 300)
  }

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
