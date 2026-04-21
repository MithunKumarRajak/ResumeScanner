import { CheckCircle, XCircle, Zap, MessageSquare, TrendingUp } from 'lucide-react'

function ScoreCircle({ score }) {
  const color =
    score >= 70 ? '#22c55e' :
    score >= 40 ? '#f59e0b' :
    '#ef4444'

  const r    = 44
  const circ = 2 * Math.PI * r
  const dash = circ - (circ * score) / 100

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="120" height="120" viewBox="0 0 120 120" className="animate-score-pop">
        {/* Track */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke="rgba(148,163,184,0.1)"
          strokeWidth="10"
        />
        {/* Fill */}
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dash}
          transform="rotate(-90 60 60)"
          style={{
            filter: `drop-shadow(0 0 8px ${color}88)`,
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
        <text
          x="60" y="60"
          dominantBaseline="middle"
          textAnchor="middle"
          fill={color}
          fontSize="22"
          fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {score}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 font-medium">Match Score</span>
    </div>
  )
}

function ScoreBar({ value }) {
  const color =
    value >= 70 ? 'from-green-500 to-emerald-400' :
    value >= 40 ? 'from-amber-500 to-yellow-400' :
    'from-red-500 to-rose-400'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Resume–Job Match</span>
        <span className="font-semibold text-white">{value}%</span>
      </div>
      <div className="score-bar-track">
        <div
          className={`score-bar-fill bg-gradient-to-r ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export default function MatchResultCard({ result }) {
  if (!result) return null

  const {
    matchScore,
    category,
    confidence,
    matchingSkills = [],
    missingSkills  = [],
    recommendation,
  } = result

  const confidencePct = Math.round((confidence || 0) * 100)

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Header Row */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-400" />
          <p className="font-semibold text-white">Match Analysis</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {matchScore !== null ? (
            <ScoreCircle score={matchScore} />
          ) : (
            <div className="text-center">
              <p className="text-4xl font-bold gradient-text">N/A</p>
              <p className="text-xs text-slate-400 mt-1">No JD provided</p>
            </div>
          )}

          <div className="flex-1 space-y-4 w-full">
            {/* Category */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Predicted Category</p>
              <p className="text-xl font-bold text-white">{category}</p>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Classifier Confidence</span>
                <span className="font-semibold text-white">{confidencePct}%</span>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill bg-gradient-to-r from-indigo-500 to-violet-400"
                  style={{ width: `${confidencePct}%` }}
                />
              </div>
            </div>

            {/* Match bar (if available) */}
            {matchScore !== null && <ScoreBar value={matchScore} />}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      {(matchingSkills.length > 0 || missingSkills.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Matching */}
          {matchingSkills.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-sm font-semibold text-white">
                  Matching Skills
                  <span className="ml-2 text-xs font-normal text-green-400">({matchingSkills.length})</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {matchingSkills.map((s) => (
                  <span key={s} className="skill-match">✓ {s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Missing */}
          {missingSkills.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm font-semibold text-white">
                  Missing Skills
                  <span className="ml-2 text-xs font-normal text-red-400">({missingSkills.length})</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingSkills.map((s) => (
                  <span key={s} className="skill-missing">✗ {s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 mt-0.5">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Recommendation</p>
              <p className="text-sm text-slate-300 leading-relaxed">{recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
