import { useMemo } from 'react'
import { Briefcase, Clock, CalendarDays, AlertCircle } from 'lucide-react'

function formatDuration(start, end, isCurrent) {
  const d1 = new Date(start)
  const d2 = isCurrent ? new Date() : new Date(end)
  
  let months = (d2.getFullYear() - d1.getFullYear()) * 12
  months -= d1.getMonth()
  months += d2.getMonth()
  
  if (months < 0) months = 0
  
  const years = Math.floor(months / 12)
  const remMonths = months % 12
  
  if (years === 0) return `${remMonths} mos`
  if (remMonths === 0) return `${years} yrs`
  return `${years} yrs ${remMonths} mos`
}

function formatDate(dateString, isCurrent) {
  if (isCurrent) return 'Present'
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function ExperienceTimeline({ workHistory = [], totalYears = 0, careerGaps = [] }) {
  
  const timelineItems = useMemo(() => {
    const items = []
    
    workHistory.forEach(job => {
      items.push({
        type: 'job',
        dateForSort: new Date(job.end_date || new Date()).getTime(),
        ...job
      })
    })
    
    careerGaps.forEach(gap => {
      items.push({
        type: 'gap',
        dateForSort: new Date(gap.gap_end).getTime(),
        ...gap
      })
    })
    
    // Sort descending by end date
    return items.sort((a, b) => b.dateForSort - a.dateForSort)
  }, [workHistory, careerGaps])

  if (!workHistory || workHistory.length === 0) {
    return (
      <div className="glass-card p-8 flex flex-col items-center justify-center text-center space-y-3">
        <div className="p-3 bg-slate-800/50 rounded-full text-slate-400">
          <Clock className="h-6 w-6 animate-pulse" />
        </div>
        <p className="text-slate-300 font-medium">Experience extraction in progress...</p>
        <p className="text-xs text-slate-500 max-w-xs">We're parsing your resume to build a structured work history timeline.</p>
      </div>
    )
  }

  const years = Math.floor(totalYears)
  const months = Math.round((totalYears - years) * 12)

  return (
    <div className="glass-card p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-700/50">
        <Briefcase className="h-5 w-5 text-indigo-400" />
        <h3 className="font-semibold text-white">Experience Timeline</h3>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 rounded-full text-xs font-medium border border-indigo-500/20">
          <Clock className="h-3.5 w-3.5" />
          <span>{years > 0 ? `${years} yrs ` : ''}{months > 0 ? `${months} mos ` : ''} total experience</span>
        </div>
      </div>

      <div className="relative pl-3 space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
        {timelineItems.map((item, idx) => {
          if (item.type === 'job') {
            return (
              <div key={`job-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-900 bg-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10" />
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-xl transition-all hover:bg-slate-800/50 hover:border-indigo-500/30">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-white text-base">{item.title || 'Untitled Role'}</h4>
                    <p className="text-sm font-medium text-indigo-400">{item.company || 'Unknown Company'}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{formatDate(item.start_date)} - {formatDate(item.end_date, item.is_current)}</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                      <span className="font-medium text-slate-300">{formatDuration(item.start_date, item.end_date, item.is_current)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          } else {
            // Gap
            const gapMonths = Math.round(item.gap_days / 30)
            return (
              <div key={`gap-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-slate-900 bg-amber-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
                   <AlertCircle className="h-3 w-3 text-slate-900 absolute" />
                </div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 border-dashed">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-amber-400">Career Gap</p>
                    </div>
                    <p className="text-xs font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                      ~{gapMonths} months
                    </p>
                  </div>
                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  )
}
