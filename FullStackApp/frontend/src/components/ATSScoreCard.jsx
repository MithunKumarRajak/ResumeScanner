import { useState } from 'react'
import { CheckCircle, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, FileText } from 'lucide-react'

import ScoreCircle from './ScoreCircle'

function IssueItem({ issue }) {
  const [isOpen, setIsOpen] = useState(false)

  const isHigh = issue.severity === 'high'
  const isMedium = issue.severity === 'medium'
  const Icon = isHigh ? AlertCircle : isMedium ? AlertTriangle : Info
  const iconColor = isHigh ? 'text-red-400' : isMedium ? 'text-amber-400' : 'text-slate-400'
  const badgeColor = isHigh ? 'bg-red-400/10 text-red-400 border-red-400/20' : 
                     isMedium ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 
                     'bg-slate-400/10 text-slate-300 border-slate-400/20'

  return (
    <div className="glass-card p-4 overflow-hidden">
      <div 
        className="flex items-start justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-start gap-3 flex-1">
          <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} />
          <div>
            <p className="text-sm font-medium text-slate-200">{issue.issue || issue.message}</p>
            <div className={`mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeColor} uppercase tracking-wider`}>
              {issue.severity}
            </div>
          </div>
        </div>
        <button className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-400">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 text-sm text-slate-300 pl-8 animate-slide-up">
          <p className="font-semibold text-indigo-300 mb-1">Suggestion:</p>
          <p>{issue.suggestion}</p>
        </div>
      )}
    </div>
  )
}

export default function ATSScoreCard({ atsScore, issues = [], passed }) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <p className="font-semibold text-white">ATS Compatibility</p>
          </div>
          {passed ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>ATS Compatible</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Needs Improvement</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreCircle score={atsScore || 0} />
          
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <h3 className="text-xl font-bold text-white">
              {passed ? "Looks Good!" : "Optimization Recommended"}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {passed 
                ? "Your resume meets standard ATS criteria. It's well-structured and easily readable by automated parsing systems." 
                : `We found ${issues.length} potential formatting issues that might prevent Applicant Tracking Systems from parsing your resume correctly.`}
            </p>
            
            {!passed && (
              <button className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
                Fix These Issues
              </button>
            )}
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-3 mt-6">
          <h4 className="text-sm font-semibold text-slate-300 ml-1">Identified Issues ({issues.length})</h4>
          <div className="grid grid-cols-1 gap-3">
            {issues.map((issue, idx) => (
              <IssueItem key={idx} issue={issue} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
