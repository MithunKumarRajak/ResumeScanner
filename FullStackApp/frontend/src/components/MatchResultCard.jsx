import { CheckCircle, XCircle, Zap, MessageSquare, TrendingUp, ChevronDown } from 'lucide-react'

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
  const hasJobDescription = matchScore !== null && matchScore !== undefined
  const sortedTopCategories = [...topCategories]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 3)

  return (
    <div className="space-y-4 animate-slide-up">

      {/* Header Row */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-400" />
          <p className="font-semibold text-white">Match Analysis</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {matchScore !== null ? (
            <ScoreCircle score={matchScore} />
          ) : (
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/40 text-center">
              <p className="text-3xl font-bold gradient-text">N/A</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">No JD</p>
            </div>
          )}

          <div className="flex-1 space-y-4 w-full">
            {/* Category */}
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Predicted Category</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold text-white">{category}</p>
                {modelVersion && (
                  <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
                    {modelVersion}
                  </span>
                )}
                {modelType && (
                  <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-2.5 py-1 text-[11px] text-slate-400">
                    {modelType}
                  </span>
                )}
              </div>
              {needsHumanReview && reviewReason && (
                <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  {reviewReason}
                </p>
              )}
              {!needsHumanReview && (
                <p className="mt-2 text-xs text-slate-400">
                  This is the most likely category based on the resume content.
                </p>
              )}
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
              <p className="text-xs text-slate-500">
                Prediction margin { (predictionMargin * 100).toFixed(1) }%
                {needsHumanReview ? ' · manual review suggested' : ''}
              </p>
            )}

            {/* Match bar (if available) */}
            {hasJobDescription && <ScoreBar value={matchScore} />}
          </div>
        </div>
      </div>

      {hasJobDescription ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedTopCategories.length > 0 && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                <p className="text-sm font-semibold text-white">Alternate Fits</p>
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
            </div>
          )}

          {applyNowReadiness && (
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-semibold text-white">Application Readiness</p>
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
              </div>
            </div>
          )}

          {(resumeGaps.length > 0 || improvementTips.length > 0) && (
            <div className="glass-card p-5 space-y-3 lg:col-span-2">
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-white">
                  <span>Why this result?</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </summary>
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {resumeGaps.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Top Improvements</p>
                      <div className="space-y-2">
                        {resumeGaps.slice(0, 4).map((gap, index) => (
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
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Suggested Edits</p>
                      <ul className="space-y-2">
                        {improvementTips.slice(0, 3).map((tip) => (
                          <li key={tip} className="rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2 text-sm text-slate-300 leading-relaxed">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card p-5 space-y-3">
          <p className="text-sm font-semibold text-white">Category Summary</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            The resume is most likely classified as <span className="font-semibold text-white">{category}</span>.
            Add a job description to unlock match score, readiness, and tailoring suggestions.
          </p>
          {sortedTopCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {sortedTopCategories.map((item) => (
                <span key={item.category} className="skill-match">
                  {item.category}
                </span>
              ))}
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
