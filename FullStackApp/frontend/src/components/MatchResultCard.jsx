import { CheckCircle, XCircle, Zap, MessageSquare, TrendingUp } from 'lucide-react'

import ScoreCircle from './ScoreCircle'

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
    confidencePct,
    modelVersion,
    modelType,
    categoryCount,
    featureCount,
    predictionMargin,
    needsHumanReview,
    reviewReason,
    topCategories = [],
    allProbabilities = {},
    roleSuggestions = [],
    resumeGaps = [],
    applyNowReadiness = null,
    improvementTips = [],
    matchingSkills = [],
    missingSkills  = [],
    recommendation,
  } = result

  const displayConfidencePct = confidencePct ?? Math.round((confidence || 0) * 100)
  const sortedTopCategories = [...topCategories]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)

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
              <div className="mt-1 space-y-1">
                {modelVersion && <p className="text-xs text-slate-400">Model: {modelVersion}</p>}
                {modelType && <p className="text-xs text-slate-400">Type: {modelType}</p>}
                {typeof categoryCount === 'number' && <p className="text-xs text-slate-400">Categories: {categoryCount}</p>}
                {typeof featureCount === 'number' && <p className="text-xs text-slate-400">Features: {featureCount}</p>}
              </div>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Classifier Confidence</span>
                <span className="font-semibold text-white">{displayConfidencePct}%</span>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill bg-gradient-to-r from-indigo-500 to-violet-400"
                  style={{ width: `${displayConfidencePct}%` }}
                />
              </div>
            </div>

            {typeof predictionMargin === 'number' && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                Prediction margin: <span className="font-semibold text-white">{(predictionMargin * 100).toFixed(1)}%</span>
                {needsHumanReview && <span className="ml-2 text-amber-400">Human review recommended</span>}
                {reviewReason && <div className="mt-1 text-slate-400">{reviewReason}</div>}
              </div>
            )}

            {/* Match bar (if available) */}
            {matchScore !== null && <ScoreBar value={matchScore} />}
          </div>
        </div>
      </div>

      {/* Top category alternatives */}
      {sortedTopCategories.length > 0 && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <p className="text-sm font-semibold text-white">Top Category Candidates</p>
          </div>
          <div className="space-y-2">
            {sortedTopCategories.map((item, index) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{index + 1}. {item.category}</span>
                  <span className="font-semibold text-white">{item.score.toFixed(1)}%</span>
                </div>
                <div className="score-bar-track">
                  <div
                    className={`score-bar-fill ${index === 0 ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'}`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {Object.keys(allProbabilities).length > 0 && (
            <details className="text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">View all probabilities</summary>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {Object.entries(allProbabilities)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 12)
                  .map(([label, score]) => (
                    <div key={label} className="flex items-center justify-between rounded-md bg-slate-900/40 px-2 py-1">
                      <span className="truncate pr-2">{label}</span>
                      <span className="font-semibold text-white">{(score * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Candidate Guidance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {roleSuggestions.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-white">Role Suggestions</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {roleSuggestions.map((role) => (
                <span key={role} className="skill-match">{role}</span>
              ))}
            </div>
          </div>
        )}

        {applyNowReadiness && (
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-semibold text-white">Apply-Now Readiness</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{applyNowReadiness.label}</span>
                <span className="font-semibold text-white">{applyNowReadiness.score.toFixed(1)}%</span>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill bg-gradient-to-r from-amber-500 to-rose-400"
                  style={{ width: `${Math.max(0, Math.min(100, applyNowReadiness.score))}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{applyNowReadiness.detail}</p>
              <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${applyNowReadiness.should_apply ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                {applyNowReadiness.should_apply ? 'Ready to apply now' : 'Tailor first'}
              </div>
            </div>
          </div>
        )}
      </div>

      {(resumeGaps.length > 0 || improvementTips.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {resumeGaps.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm font-semibold text-white">Resume Gaps</p>
              </div>
              <div className="space-y-2">
                {resumeGaps.slice(0, 8).map((gap, index) => (
                  <div key={`${gap.item}-${index}`} className="rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-white capitalize">{gap.item}</span>
                      <span className={`text-[10px] uppercase tracking-wider ${gap.priority === 'high' ? 'text-red-300' : 'text-amber-300'}`}>{gap.priority}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{gap.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {improvementTips.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-400" />
                <p className="text-sm font-semibold text-white">Personalized Improvement Tips</p>
              </div>
              <ul className="space-y-2">
                {improvementTips.slice(0, 5).map((tip) => (
                  <li key={tip} className="rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2 text-sm text-slate-300 leading-relaxed">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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
                  <span key={s} className="skill-match"> {s}</span>
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
