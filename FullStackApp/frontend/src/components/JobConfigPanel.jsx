import { FileText, Tag, Sliders, Briefcase } from 'lucide-react'
import SkillTagInput from './SkillTagInput'
import { useCategories } from '../hooks/useCategories'
import useStore from '../store'

function Label({ children, icon: Icon }) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </label>
  )
}

export default function JobConfigPanel() {
  const jobConfig    = useStore((s) => s.jobConfig)
  const setJobConfig = useStore((s) => s.setJobConfig)

  const { data: categories = [], isLoading: loadingCats } = useCategories()

  const {
    jdText,
    requiredSkills,
    experienceMin,
    experienceMax,
    role,
  } = jobConfig

  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
          <Briefcase className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Job Description</p>
          <p className="text-xs text-slate-400">Describe the role you are targeting</p>
        </div>
      </div>

      {/* JD Textarea */}
      <div>
        <Label icon={FileText}>Job Description Text</Label>
        <textarea
          value={jdText}
          onChange={(e) => setJobConfig({ jdText: e.target.value })}
          placeholder="Paste the full job description here…"
          className="form-textarea"
          rows={5}
          id="jd-textarea"
        />
        <p className="mt-1 text-xs text-slate-500">{jdText.length} characters</p>
      </div>

      {/* Required Skills */}
      <div>
        <Label icon={Tag}>Required Skills</Label>
        <SkillTagInput
          tags={requiredSkills}
          onChange={(updated) => setJobConfig({ requiredSkills: updated })}
          placeholder="Add required skills (e.g. Python, React)…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Experience Range */}
        <div>
          <Label icon={Sliders}>Experience Range</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-6">Min</span>
              <input
                type="range"
                min={0}
                max={20}
                value={experienceMin}
                onChange={(e) =>
                  setJobConfig({ experienceMin: Math.min(Number(e.target.value), experienceMax) })
                }
                className="form-range flex-1"
                id="exp-min"
              />
              <span className="text-sm font-semibold text-indigo-400 min-w-[30px]">
                {experienceMin}y
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-6">Max</span>
              <input
                type="range"
                min={0}
                max={20}
                value={experienceMax}
                onChange={(e) =>
                  setJobConfig({ experienceMax: Math.max(Number(e.target.value), experienceMin) })
                }
                className="form-range flex-1"
                id="exp-max"
              />
              <span className="text-sm font-semibold text-indigo-400 min-w-[30px]">
                {experienceMax}y
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {experienceMin} – {experienceMax} years required
          </p>
        </div>

        {/* Role / Category */}
        <div>
          <Label icon={Briefcase}>Job Role / Category</Label>
          {loadingCats ? (
            <div className="h-10 rounded-xl skeleton-pulse" />
          ) : (
            <select
              value={role}
              onChange={(e) => setJobConfig({ role: e.target.value })}
              className="form-select"
              id="jd-role-select"
            >
              <option value="">Select a category…</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  )
}
