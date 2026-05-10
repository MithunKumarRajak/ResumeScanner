import { useState, useRef, useEffect } from 'react'
import { Upload, FileText, X, AlertCircle, Loader2, CheckCircle2, CheckCircle, BarChart, Server, GitCompare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { bulkUpload, getBulkStatus } from '../services/api'

const ALLOWED = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 5 * 1024 * 1024
const MAX_FILES = 50

export default function BulkUpload() {
  const [drag, setDrag] = useState(false)
  const [files, setFiles] = useState([])
  const [jobDescId, setJobDescId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  
  // Job status state
  const [bulkJobId, setBulkJobId] = useState(null)
  const [jobStatus, setJobStatus] = useState(null) // 'pending', 'processing', 'completed', 'failed'
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState([])
  
  const ref = useRef(null)

  const handleFiles = (newFiles) => {
    setError('')
    const validFiles = Array.from(newFiles).filter(f => {
      if (!ALLOWED.includes(f.type)) {
        setError(prev => prev ? `${prev}\nSome files were skipped (only PDF/DOCX allowed).` : 'Some files were skipped (only PDF/DOCX allowed).')
        return false
      }
      if (f.size > MAX_SIZE) {
        setError(prev => prev ? `${prev}\nSome files exceeded 5MB limit.` : 'Some files exceeded 5MB limit.')
        return false
      }
      return true
    })

    setFiles(prev => {
      const combined = [...prev, ...validFiles]
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed. Truncating list.`)
        return combined.slice(0, MAX_FILES)
      }
      return combined
    })
  }

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setError('')
    setJobStatus('pending')
    setProgress(0)
    setResults([])
    
    try {
      const res = await bulkUpload(files, jobDescId)
      setBulkJobId(res.bulk_job_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start bulk upload.')
      setJobStatus('failed')
    }
  }

  useEffect(() => {
    let intervalId = null
    
    const checkStatus = async () => {
      if (!bulkJobId) return
      
      try {
        const res = await getBulkStatus(bulkJobId)
        setJobStatus(res.status)
        setProgress(res.progress_percent)
        
        if (res.status === 'completed' || res.status === 'failed') {
          clearInterval(intervalId)
          if (res.results) {
            setResults(res.results)
          }
        }
      } catch (err) {
        console.error("Failed to fetch bulk status", err)
      }
    }

    if (bulkJobId && jobStatus !== 'completed' && jobStatus !== 'failed') {
      intervalId = setInterval(checkStatus, 3000)
      // Initial check right away
      checkStatus()
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [bulkJobId, jobStatus])

  const reset = () => {
    setFiles([])
    setBulkJobId(null)
    setJobStatus(null)
    setProgress(0)
    setResults([])
    setError('')
  }

  const handleCompareSelected = () => {
    // Filter successful uploads
    const successfulResults = results.filter(r => r.status === 'success')
    if (successfulResults.length < 2) {
      setError('Please ensure at least 2 resumes uploaded successfully to compare.')
      return
    }
    
    // Pass successful resume data to CompareView
      const resumeData = successfulResults.map((r, index) => ({
        id: r.resume_id || `bulk_resume_${Date.now()}_${index}`,
        name: r.candidate_name || r.file_name.replace(/\.[^/.]+$/, ''),
        file_name: r.file_name,
        category: r.category || 'Uncategorized',
        role: r.role || r.category,
        uploadedAt: new Date().toISOString(),
        resumeId: r.resume_id
      }))
    
    navigate('/compare', { 
      state: { 
        bulkUploadedResumes: resumeData,
        sourceJobDescId: jobDescId 
      } 
    })
  }

  const isUploading = jobStatus === 'pending' || jobStatus === 'processing'
  const isDone = jobStatus === 'completed'

  if (isDone) {
    const successCount = results.filter(r => r.status === 'success').length
    
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-slide-up">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-400" />
              Batch <span className="gradient-text">Complete</span>
            </h1>
            <p className="text-slate-400 mt-2">Processed {successCount} of {files.length} resumes successfully.</p>
          </div>
          <div className="flex gap-2">
            {successCount >= 2 && (
              <button 
                onClick={handleCompareSelected}
                className="btn-primary flex items-center gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare Candidates
              </button>
            )}
            <button onClick={reset} className="btn-secondary">Process New Batch</button>
          </div>
        </div>

        <div className="glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50">
                <th className="p-4 text-sm font-medium text-slate-300 border-b border-slate-700/50">File Name</th>
                <th className="p-4 text-sm font-medium text-slate-300 border-b border-slate-700/50">Status</th>
                <th className="p-4 text-sm font-medium text-slate-300 border-b border-slate-700/50">Category</th>
                <th className="p-4 text-sm font-medium text-slate-300 border-b border-slate-700/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-xs">{r.file_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {r.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="h-3 w-3" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-xs font-semibold" title={r.error}>
                        <AlertCircle className="h-3 w-3" /> Error
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {r.category ? (
                      <span className="text-sm text-slate-300">{r.category}</span>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded text-xs font-medium transition-colors border border-indigo-500/20">
                      Shortlist
                    </button>
                    <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition-colors border border-slate-700">
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
          <Server className="h-8 w-8 text-indigo-400" />
          Bulk <span className="gradient-text">Processor</span>
        </h1>
        <p className="text-slate-400 mt-2">Upload up to 50 resumes at once for automated parsing, categorization, and scoring.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6">
        <div className="space-y-4">
          <div 
            onDragOver={e => { e.preventDefault(); setDrag(true) }} 
            onDragLeave={() => setDrag(false)}
            onDrop={e => { 
              e.preventDefault(); 
              setDrag(false); 
              if (!isUploading && e.dataTransfer.files?.length > 0) {
                handleFiles(e.dataTransfer.files)
              }
            }}
            onTouchStart={() => setDrag(true)}
            onTouchEnd={() => setDrag(false)}
            onClick={() => !isUploading && ref.current?.click()}
            className={`glass-card p-10 text-center transition-all ${
              isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]'
            } ${drag ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : ''}`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4">
              <Upload className="h-8 w-8" />
            </div>
            <p className="text-lg font-medium text-slate-200">Drop your resumes here or <span className="text-indigo-400">browse</span></p>
            <p className="text-sm text-slate-500 mt-2">PDF or DOCX, up to 5 MB each. Max {MAX_FILES} files.</p>
            <input 
              ref={ref} 
              type="file" 
              multiple 
              accept=".pdf,.docx" 
              onChange={e => e.target.files?.length > 0 && handleFiles(e.target.files)} 
              className="hidden" 
              disabled={isUploading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="whitespace-pre-line">{error}</p>
            </div>
          )}

          {isUploading && (
            <div className="glass-card p-6 space-y-4 animate-pulse-slow">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  {jobStatus === 'pending' ? 'Queuing batch job...' : 'Processing resumes...'}
                </span>
                <span className="text-indigo-400 font-bold">{progress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card p-0 overflow-hidden flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" /> Upload Queue
            </h3>
            <span className="text-xs font-semibold px-2 py-1 bg-slate-800 text-slate-300 rounded-md">
              {files.length} files
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <FileText className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No files queued</p>
              </div>
            ) : (
              files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-700/50 bg-slate-800/30 group">
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium text-slate-200 truncate">{f.name}</p>
                    <p className="text-xs text-slate-500">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                  {!isUploading && (
                    <button 
                      onClick={() => removeFile(i)}
                      className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded-md transition-colors shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="p-4 border-t border-slate-700/50 bg-slate-900/50 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Job Description ID (Optional)</label>
              <input 
                type="text" 
                value={jobDescId}
                onChange={(e) => setJobDescId(e.target.value)}
                placeholder="Target Job ID..." 
                className="form-input text-sm py-2" 
                disabled={isUploading}
              />
            </div>
            <button 
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
              className="btn-primary w-full py-2.5"
            >
              Start Processing {files.length > 0 && `(${files.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
