import { Briefcase, TrendingUp, Tag } from 'lucide-react'

/**
 * JobRecommendationCard — displayed in a grid for the candidate view.
 *
 * Props:
 *   title      {string}  — Job title / category
 *   matchPct   {number}  — 0-100
 *   skills     {string[]} — Key required skills
 *   rank       {number}  — Display rank (1-based)
 */
export default function JobRecommendationCard({ title, matchPct = 0, skills = [], rank }) {
  const color =
    matchPct >= 70 ? { text: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/25' } :
    matchPct >= 40 ? { text: 'text-amber-400',  bg: 'bg-amber-400/10',  border: 'border-amber-400/25' } :
                     { text: 'text-rose-400',   bg: 'bg-rose-400/10',   border: 'border-rose-400/25'  }

  return (
    <div className="glass-card-hover p-5 space-y-4 cursor-default flex flex-col">
      {/* Rank badge + icon */}
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
          <Briefcase className="h-5 w-5" />
        </div>
        {rank && (
          <span className="text-xs font-bold text-slate-500">#{rank}</span>
        )}
      </div>

      {/* Title */}
      <div>
        <p className="font-semibold text-white leading-tight">{title}</p>
      </div>

      {/* Match % pill */}
      <div className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold border ${color.bg} ${color.border} ${color.text}`}>
        <TrendingUp className="h-3 w-3" />
        {matchPct}% match
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="space-y-2 flex-1">
          <p className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Tag className="h-3 w-3" />
            Key Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 6).map((s) => (
              <span key={s} className="skill-neutral">{s}</span>
            ))}
            {skills.length > 6 && (
              <span className="skill-neutral">+{skills.length - 6} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
