import { useState, useEffect } from 'react'
import { ArrowLeft, CheckSquare, Square, Download, Trophy, Loader2, Search, Users, GitCompare, UploadCloud } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { compareCandidates, getUserData } from '../services/api'

export default function CompareView() {
  const location = useLocation()
  const bulkState = location.state || {}

  const [candidates, setCandidates] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [jobDescId, setJobDescId] = useState('')
  const [loading, setLoading] = useState(false)
  const [compareData, setCompareData] = useState(null)
  const [error, setError] = useState('')
  const [fromBulk, setFromBulk] = useState(false)

  // Load candidates: from bulk upload state OR fetch from API
  useEffect(() => {
    // If navigated from Bulk Upload with candidates
    if (bulkState.bulkCandidates && bulkState.bulkCandidates.length > 0) {
      setCandidates(bulkState.bulkCandidates)
      setFromBulk(true)
      // Pre-select up to 4 candidates
      if (bulkState.preSelectedIds && bulkState.preSelectedIds.length > 0) {
        setSelectedIds(bulkState.preSelectedIds.slice(0, 4))
      }
      return
    }

    // Otherwise fetch from API or use mocks
    const fetchResumes = async () => {
      try {
        const data = await getUserData('resumes')
        if (data && data.resumes && data.resumes.length > 0) {
          setCandidates(data.resumes)
        } else {
          // Fallback mocks
          setCandidates([
            { id: '1', name: 'John Doe', role: 'Software Engineer', uploadedAt: '2026-05-01' },
            { id: '2', name: 'Jane Smith', role: 'Frontend Developer', uploadedAt: '2026-05-02' },
            { id: '3', name: 'Alice Johnson', role: 'Backend Engineer', uploadedAt: '2026-05-03' },
            { id: '4', name: 'Bob Williams', role: 'Full Stack Developer', uploadedAt: '2026-05-04' },
            { id: '5', name: 'Charlie Brown', role: 'UI/UX Designer', uploadedAt: '2026-05-05' },
          ])
        }
      } catch (err) {
        setCandidates([
          { id: '1', name: 'John Doe', role: 'Software Engineer' },
          { id: '2', name: 'Jane Smith', role: 'Frontend Developer' },
          { id: '3', name: 'Alice Johnson', role: 'Backend Engineer' },
          { id: '4', name: 'Bob Williams', role: 'Full Stack Developer' },
        ])
      }
    }
    fetchResumes()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      if (selectedIds.length >= 4) return
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      setError('Please select at least 2 candidates to compare.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await compareCandidates(selectedIds, jobDescId || null)
      setCompareData(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compare candidates.')
      // Mock result if API fails for demonstration
      setCompareData({
        best_match_id: selectedIds[0],
        skill_union: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'SQL'],
        candidates: selectedIds.map((id, index) => ({
          resume_id: id,
          name: candidates.find(c => c.id === id)?.name || `Candidate ${id}`,
          overall_score: 85 - (index * 5),
          keyword_score: 80 - (index * 4),
          ats_score: 90 - (index * 6),
          matched_skills: ['React', 'Node.js'],
          missing_skills: ['Python', 'AWS'],
          experience_years: 5 - index,
        }))
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = () => {
    window.print()
  }

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-indigo-400" />
            Compare <span className="gradient-text">Candidates</span>
          </h1>
          <p className="text-slate-400 mt-2">Select up to 4 candidates to compare side-by-side.</p>
        </div>
        {compareData && (
          <button onClick={handleExportPDF} className="btn-secondary hidden sm:flex items-center gap-2">
            <Download className="h-4 w-4" /> Export Report
          </button>
        )}
      </div>

      {fromBulk && !compareData && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/8 border border-indigo-500/20 animate-slide-up">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
            <UploadCloud className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-300">Loaded from Bulk Upload</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {candidates.length} candidates imported • {selectedIds.length} pre-selected for comparison
            </p>
          </div>
        </div>
      )}

      {!compareData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-white">Select Candidates</h2>
              <span className="text-sm font-medium px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                {selectedIds.length} / 4 Selected
              </span>
            </div>
            
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input type="text" placeholder="Search candidates..." className="form-input pl-10" />
            </div>

            <div className="space-y-2">
              {candidates.map(candidate => {
                const isSelected = selectedIds.includes(candidate.id)
                const isDisabled = !isSelected && selectedIds.length >= 4
                
                return (
                  <div 
                    key={candidate.id}
                    onClick={() => !isDisabled && toggleSelect(candidate.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-indigo-500/10 border-indigo-500/30' 
                        : isDisabled 
                          ? 'bg-slate-900/50 border-slate-800 opacity-50 cursor-not-allowed'
                          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-200">{candidate.name}</p>
                      <p className="text-xs text-slate-400">{candidate.role || 'Uploaded resume'}</p>
                      {(candidate.confidence != null || candidate.experience_years != null) && (
                        <div className="flex items-center gap-3 mt-1.5">
                          {candidate.confidence != null && (
                            <span className={`text-[11px] font-semibold ${
                              candidate.confidence >= 80 ? 'text-emerald-400' : candidate.confidence >= 50 ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {Math.round(candidate.confidence)}% match
                            </span>
                          )}
                          {candidate.experience_years != null && (
                            <span className="text-[11px] text-slate-500">{candidate.experience_years} yr exp</span>
                          )}
                        </div>
                      )}
                    </div>
                    {isSelected ? (
                      <CheckSquare className="h-5 w-5 text-indigo-400" />
                    ) : (
                      <Square className={`h-5 w-5 ${isDisabled ? 'text-slate-600' : 'text-slate-500'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">Configuration</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Job Description ID (Optional)</label>
                  <input 
                    type="text" 
                    value={jobDescId}
                    onChange={(e) => setJobDescId(e.target.value)}
                    placeholder="Enter Job ID" 
                    className="form-input" 
                  />
                </div>
                
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {error}
                  </div>
                )}
                
                <button 
                  onClick={handleCompare} 
                  disabled={selectedIds.length < 2 || loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                  Compare Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-slide-up">
          <div className="flex items-center gap-4">
            <button onClick={() => setCompareData(null)} className="btn-ghost flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Edit Selection
            </button>
          </div>

          {/* Best Match Banner */}
          {compareData.best_match_id && (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-indigo-900/20 to-violet-500/10 p-6 sm:p-8">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
              
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <Trophy className="h-8 w-8" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-1">Top Candidate</p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    {compareData.candidates.find(c => c.resume_id === compareData.best_match_id)?.name || 'Candidate'}
                  </h2>
                </div>
                <div className="sm:ml-auto mt-4 sm:mt-0 flex gap-3">
                  <button className="btn-primary">Shortlist</button>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Grid */}
          <div className="overflow-x-auto pb-4">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="p-4 text-left font-semibold text-slate-400 border-b border-slate-700/50 w-1/5">Metric</th>
                  {compareData.candidates.map(c => (
                    <th key={c.resume_id} className="p-4 text-center border-b border-slate-700/50 bg-slate-800/30 rounded-t-xl w-1/5">
                      <div className="font-bold text-white text-lg">{c.name}</div>
                      {c.category && (
                        <span className="inline-block mt-1 text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {c.category}
                        </span>
                      )}
                      {c.resume_id === compareData.best_match_id && (
                        <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          <Trophy className="h-3 w-3" /> Best Match
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall Score */}
                <tr className="border-b border-slate-800">
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30">Overall Score</td>
                  {compareData.candidates.map(c => {
                    const maxScore = Math.max(...compareData.candidates.map(cand => cand.overall_score))
                    const isBest = c.overall_score === maxScore && maxScore > 0
                    return (
                      <td key={c.resume_id} className={`p-4 text-center ${isBest ? 'bg-green-500/5' : ''}`}>
                        <span className={`text-2xl font-bold ${isBest ? 'text-green-400' : 'text-slate-200'}`}>
                          {Math.round(c.overall_score)}%
                        </span>
                      </td>
                    )
                  })}
                </tr>
                
                {/* ATS Score */}
                <tr className="border-b border-slate-800">
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30">ATS Score</td>
                  {compareData.candidates.map(c => {
                    const maxScore = Math.max(...compareData.candidates.map(cand => cand.ats_score || 0))
                    const isBest = (c.ats_score || 0) === maxScore && maxScore > 0
                    return (
                      <td key={c.resume_id} className={`p-4 text-center ${isBest ? 'bg-green-500/5' : ''}`}>
                        <span className={`text-xl font-semibold ${isBest ? 'text-green-400' : 'text-slate-300'}`}>
                          {Math.round(c.ats_score || 0)}%
                        </span>
                      </td>
                    )
                  })}
                </tr>
                
                {/* Keyword Score */}
                <tr className="border-b border-slate-800">
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30">Keyword Match</td>
                  {compareData.candidates.map(c => {
                    const maxScore = Math.max(...compareData.candidates.map(cand => cand.keyword_score || 0))
                    const isBest = (c.keyword_score || 0) === maxScore && maxScore > 0
                    return (
                      <td key={c.resume_id} className={`p-4 text-center ${isBest ? 'bg-green-500/5' : ''}`}>
                        <span className={`text-xl font-semibold ${isBest ? 'text-green-400' : 'text-slate-300'}`}>
                          {Math.round(c.keyword_score || 0)}%
                        </span>
                      </td>
                    )
                  })}
                </tr>
                
                {/* Experience Years */}
                <tr className="border-b border-slate-800">
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30">Experience</td>
                  {compareData.candidates.map(c => {
                    const maxExp = Math.max(...compareData.candidates.map(cand => cand.experience_years || 0))
                    const isBest = (c.experience_years || 0) === maxExp && maxExp > 0
                    return (
                      <td key={c.resume_id} className={`p-4 text-center ${isBest ? 'bg-green-500/5' : ''}`}>
                        <span className={`text-lg font-medium ${isBest ? 'text-green-400' : 'text-slate-300'}`}>
                          {c.experience_years} years
                        </span>
                      </td>
                    )
                  })}
                </tr>

                {/* Missing Skills */}
                <tr className="border-b border-slate-800">
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30 align-top">Missing Skills</td>
                  {compareData.candidates.map(c => (
                    <td key={c.resume_id} className="p-4 text-center align-top">
                      {c.missing_skills && c.missing_skills.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {c.missing_skills.map(s => (
                            <span key={s} className="px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-md">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                
                {/* Matched Skills */}
                <tr>
                  <td className="p-4 font-medium text-slate-300 bg-slate-900/30 rounded-bl-xl align-top">Matched Skills</td>
                  {compareData.candidates.map(c => (
                    <td key={c.resume_id} className="p-4 text-center align-top bg-slate-800/10 rounded-b-xl">
                      {c.matched_skills && c.matched_skills.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {c.matched_skills.map(s => (
                            <span key={s} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-md">
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
