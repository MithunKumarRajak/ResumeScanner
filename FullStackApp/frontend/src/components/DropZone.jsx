import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import useStore from '../store'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export default function DropZone() {
  const setResumeFile = useStore((s) => s.setResumeFile)
  const setResumeText = useStore((s) => s.setResumeText)
  const resumeFile = useStore((s) => s.resumeFile)

  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [extracting, setExtracting] = useState(false)
  const inputRef = useRef(null)

  const extractText = useCallback(async (file) => {
    setExtracting(true)
    setError('')
    try {
      if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        const workerModule = await import('pdfjs-dist/build/pdf.worker.min.js?url')
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default
        const objectUrl = URL.createObjectURL(file)
        try {
          const pdf = await pdfjsLib.getDocument(objectUrl).promise
          let text = ''
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            text += content.items.map((item) => item.str).join(' ') + '\n'
          }
          const extracted = text.trim()
          if (!extracted) {
            setError('Could not extract text from this PDF (it may be a scanned image). Please try a different file.')
          } else {
            setResumeText(extracted)
          }
        } finally {
          URL.revokeObjectURL(objectUrl)
        }
      } else {
        const mammoth = await import('mammoth')
        const buffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer: buffer })
        const extracted = result.value.trim()
        if (!extracted) {
          setError('Could not extract text from this document. Please try a different file.')
        } else {
          setResumeText(extracted)
        }
      }
    } catch (err) {
      setError('Failed to extract text. Please try a different file.')
      console.error('Text extraction error:', err)
    }
    setExtracting(false)
  }, [setResumeText])

  const handleFile = useCallback(
    (file) => {
      setError('')
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Only PDF and DOCX files are supported.')
        return
      }
      if (file.size > MAX_SIZE) {
        setError('File must be under 5MB.')
        return
      }
      setResumeFile(file)
      extractText(file)
    },
    [setResumeFile, extractText]
  )

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const clearFile = () => {
    setResumeFile(null)
    setResumeText('')
    setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
        <FileText className="h-4 w-4 text-sky-400" />
        Upload Resume <span className="text-red-400">*</span>
      </label>

      {!resumeFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? 'dropzone-active'
              : 'border-slate-700 bg-white/[0.02] hover:border-slate-500'
          }`}
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
            <Upload className="h-5 w-5" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-sm text-slate-300">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-500">PDF or DOCX, up to 5MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={onPick}
            className="hidden"
            id="resume-upload"
          />
        </div>
      ) : (
        <div className="glass-card flex items-center justify-between p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="max-w-[200px] truncate text-sm font-medium text-white sm:max-w-xs">
                {resumeFile.name}
              </p>
              <p className="text-xs text-slate-400">
                {(resumeFile.size / 1024).toFixed(1)} KB
                {extracting && ' • Extracting text…'}
              </p>
            </div>
          </div>
          <button
            onClick={clearFile}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-400 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
