import { useNavigate } from 'react-router-dom'
import { User, GraduationCap, Briefcase, Tag, Pencil, Mail, Phone, Linkedin, Github, FileText, Award, FolderKanban, Send } from 'lucide-react'
import SkillTagInput from './SkillTagInput'
import useStore from '../store'

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </label>
      {children}
    </div>
  )
}

export default function ParsedResumeEditor() {
  const navigate = useNavigate()
  const parsedResume      = useStore((s) => s.parsedResume)
  const updateParsedResume = useStore((s) => s.updateParsedResume)
  const setResumeBuildData = useStore((s) => s.setResumeBuildData)

  if (!parsedResume) return null

  const {
    name = '', email = '', phone = '', linkedin = '', github = '',
    skills = [], education = '', experience = 0, role = '',
    summary = '', projects = '', certifications = ''
  } = parsedResume

  const handleSendToBuilder = () => {
    setResumeBuildData(parsedResume)
    navigate('/resume-build')
  }

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
            <Pencil className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Parsed Resume</p>
            <p className="text-xs text-slate-400">Review and edit extracted information</p>
          </div>
        </div>
        <button onClick={handleSendToBuilder} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm" id="send-to-builder-btn">
          <Send className="h-4 w-4" /> Send to Resume Builder
        </button>
      </div>

      {/* Personal Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Full Name" icon={User}>
          <input
            type="text"
            value={name}
            onChange={(e) => updateParsedResume({ name: e.target.value })}
            placeholder="Candidate name"
            className="form-input"
            id="parsed-name"
          />
        </Field>
        <Field label="Email" icon={Mail}>
          <input
            type="email"
            value={email}
            onChange={(e) => updateParsedResume({ email: e.target.value })}
            placeholder="email@example.com"
            className="form-input"
            id="parsed-email"
          />
        </Field>
        <Field label="Phone" icon={Phone}>
          <input
            type="tel"
            value={phone}
            onChange={(e) => updateParsedResume({ phone: e.target.value })}
            placeholder="+91 98765 43210"
            className="form-input"
            id="parsed-phone"
          />
        </Field>
        <Field label="LinkedIn" icon={Linkedin}>
          <input
            type="url"
            value={linkedin}
            onChange={(e) => updateParsedResume({ linkedin: e.target.value })}
            placeholder="https://linkedin.com/in/..."
            className="form-input"
            id="parsed-linkedin"
          />
        </Field>
      </div>

      {/* GitHub */}
      <Field label="GitHub" icon={Github}>
        <input
          type="url"
          value={github}
          onChange={(e) => updateParsedResume({ github: e.target.value })}
          placeholder="https://github.com/..."
          className="form-input"
          id="parsed-github"
        />
      </Field>

      {/* Professional Summary */}
      <Field label="Professional Summary" icon={FileText}>
        <textarea
          value={summary}
          onChange={(e) => updateParsedResume({ summary: e.target.value })}
          placeholder="Brief professional summary or objective..."
          className="form-textarea min-h-[80px]"
          id="parsed-summary"
        />
      </Field>

      {/* Skills */}
      <Field label="Skills" icon={Tag}>
        <SkillTagInput
          tags={skills}
          onChange={(updated) => updateParsedResume({ skills: updated })}
          placeholder="Add a skill and press Enter…"
        />
        <p className="text-xs text-slate-500">
          {skills.length} skill{skills.length !== 1 ? 's' : ''} identified
        </p>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Education */}
        <Field label="Education" icon={GraduationCap}>
          <input
            type="text"
            value={education}
            onChange={(e) => updateParsedResume({ education: e.target.value })}
            placeholder="e.g. B.Sc. Computer Science"
            className="form-input"
            id="parsed-education"
          />
        </Field>

        {/* Experience */}
        <Field label="Years of Experience" icon={Briefcase}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={20}
              value={experience}
              onChange={(e) => updateParsedResume({ experience: Number(e.target.value) })}
              className="form-range flex-1"
              id="parsed-experience"
            />
            <span className="min-w-[40px] text-right text-sm font-semibold text-indigo-400">
              {experience}y
            </span>
          </div>
        </Field>
      </div>

      {/* Preferred Role */}
      <Field label="Preferred Role" icon={Briefcase}>
        <input
          type="text"
          value={role}
          onChange={(e) => updateParsedResume({ role: e.target.value })}
          placeholder="e.g. Data Scientist, Java Developer…"
          className="form-input"
          id="parsed-role"
        />
      </Field>

      {/* Projects */}
      <Field label="Projects" icon={FolderKanban}>
        <textarea
          value={projects}
          onChange={(e) => updateParsedResume({ projects: e.target.value })}
          placeholder="List your key projects..."
          className="form-textarea min-h-[80px]"
          id="parsed-projects"
        />
      </Field>

      {/* Certifications */}
      <Field label="Certifications" icon={Award}>
        <textarea
          value={certifications}
          onChange={(e) => updateParsedResume({ certifications: e.target.value })}
          placeholder="List certifications, e.g. AWS Certified, Google Cloud..."
          className="form-textarea min-h-[60px]"
          id="parsed-certifications"
        />
      </Field>

      {/* Bottom Send Button */}
      <div className="flex justify-center pt-2">
        <button onClick={handleSendToBuilder} className="btn-primary flex items-center gap-2 px-6 py-2.5" id="send-to-builder-bottom-btn">
          <Send className="h-4 w-4" /> Send to Resume Builder
        </button>
      </div>
    </div>
  )
}
