import { useState } from 'react'
import { CheckCircle, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react'

import ScoreCircle from './ScoreCircle'

function IssueItem({ issue }) {
  const [isOpen, setIsOpen] = useState(false)

  const isHigh = issue.severity === 'high'
  const isMedium = issue.severity === 'medium'
  const Icon = isHigh ? AlertCircle : isMedium ? AlertTriangle : Info
  const iconColor = isHigh ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-[#9898a8]'
  const borderColor = isHigh ? '#f87171' : isMedium ? '#fbbf24' : '#5e5e72'

  return (
    <div className="glass-card p-4 overflow-hidden" style={{ borderLeft: `3px solid ${borderColor}`, borderRadius: '4px 16px 16px 4px' }}>
      <div 
        className="flex items-start justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
          <div>
            <p className="text-sm font-medium text-[#d4d4de]">{issue.issue || issue.message}</p>
            <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
              isHigh ? 'bg-red-500/8 text-red-400 border border-red-500/15' :
              isMedium ? 'bg-amber-500/8 text-amber-400 border border-amber-500/15' :
              'bg-[rgba(94,94,114,0.1)] text-[#9898a8] border border-[rgba(255,255,255,0.06)]'
            }`}>
              {issue.severity}
            </div>
          </div>
        </div>
        <button className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded-md transition-colors text-[#5e5e72]">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.04)] text-sm text-[#b8b8c1] pl-8 animate-slide-up">
          <p className="font-semibold text-[#2dd4a8] mb-1">Suggestion:</p>
          <p>{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

export default function ATSScoreCard({ atsScore, issues = [], passed }) {
  const issueSummary = passed
    ? 'No major ATS formatting blockers were detected.'
    : `We found ${issues.length} potential formatting issues that may affect ATS parsing.`

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#6366f1]" />
            <p className="font-semibold text-[#f0f0f5] font-display">ATS Compatibility</p>
          </div>
          {passed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(45,212,168,0.08)] text-[#2dd4a8] border border-[rgba(45,212,168,0.2)] text-xs font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>ATS Compatible</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/8 text-amber-400 border border-amber-500/15 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Needs Improvement</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreCircle score={atsScore || 0} />
          
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-bold text-[#f0f0f5] font-display">
              {passed ? 'ATS Friendly' : 'ATS Needs Attention'}
            </h3>
            <p className="text-sm text-[#9898a8] leading-relaxed">{issueSummary}</p>

            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start pt-2">
              <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.4)] px-3 py-1 text-xs text-[#b8b8c1]">
                Score {Math.round(atsScore || 0)}%
              </span>
              <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.4)] px-3 py-1 text-xs text-[#b8b8c1]">
                {passed ? 'Ready for applicant tracking systems' : `${issues.length} review items`}
              </span>
            </div>
            
            {!passed && (
              <button className="mt-4 px-4 py-2 bg-gradient-to-r from-[#6366f1] to-[#818cf8] hover:from-[#4f46e5] hover:to-[#6366f1] text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-[rgba(99,102,241,0.2)]">
                Review Details
              </button>
            )}
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <details className="space-y-3 mt-2 rounded-2xl border border-[rgba(255,255,255,0.04)] bg-[rgba(26,26,34,0.3)] p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#d4d4de] font-display">
            <span>Show ATS details ({issues.length})</span>
            <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(26,26,34,0.4)] px-2.5 py-1 text-[11px] font-medium text-[#5e5e72]">
              optional
            </span>
          </summary>
          <div className="mt-4 grid grid-cols-1 gap-3">
            {issues.map((issue, idx) => (
              <IssueItem key={idx} issue={issue} />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
