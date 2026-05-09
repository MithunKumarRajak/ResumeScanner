export default function ScoreCircle({ score, label = "Score" }) {
  const color =
    score >= 70 ? '#22c55e' :
    score >= 40 ? '#f59e0b' :
    '#ef4444'

  const r = 44
  const circ = 2 * Math.PI * r
  const dash = circ - (circ * score) / 100

  return (
    <div className="relative flex flex-col items-center gap-1">
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
          {Math.round(score)}%
        </text>
      </svg>
      {label && <span className="text-xs text-slate-400 font-medium mt-1">{label}</span>}
    </div>
  )
}
