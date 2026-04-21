import { User, GraduationCap, Briefcase, Tag, Pencil } from 'lucide-react'
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
  const parsedResume      = useStore((s) => s.parsedResume)
  const updateParsedResume = useStore((s) => s.updateParsedResume)

  if (!parsedResume) return null

  const { name = '', skills = [], education = '', experience = 0, role = '' } = parsedResume

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
          <Pencil className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Parsed Resume</p>
          <p className="text-xs text-slate-400">Review and edit extracted information</p>
        </div>
      </div>

      {/* Name */}
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
    </div>
  )
}
