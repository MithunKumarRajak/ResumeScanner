import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronDown, Zap, Mic, Check, AlertTriangle } from 'lucide-react'
import useStore from '../store'

const MODELS = [
  { id: 'ResumeModel_v2', name: 'ResumeModel_v2', description: 'Base model — KNN + OneVsRest (5K features)', badge: 'Active', type: 'base' },
  { id: 'ResumeModel_v3', name: 'ResumeModel_v3', description: 'Enhanced — Linear SVM + balanced classes (10K features)', badge: 'New', type: 'enhanced' },
  { id: 'Gemini-3.1-Pro-High', name: 'Gemini 3.1 Pro (High)', description: 'Maximum reasoning capabilities', badge: 'Soon', warning: true },
  { id: 'Gemini-3-Flash', name: 'Gemini 3 Flash', description: 'Fast and efficient reasoning', badge: 'Soon', warning: true },
  { id: 'Claude-4.6-Sonnet', name: 'Claude Sonnet 4.6 (Thinking)', description: 'Superior analytical skills', badge: 'Soon', warning: true },
]

export default function ModelSelector() {
  const selectedModel = useStore((s) => s.selectedModel)
  const setSelectedModel = useStore((s) => s.setSelectedModel)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0]

  return (
    <div className="flex items-center gap-1 rounded-2xl bg-slate-800/40 border border-slate-700/50 p-1 backdrop-blur-sm shadow-inner shadow-white/5">
      {/* Plus Button */}
      <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all cursor-pointer border-none">
        <Plus className="h-4 w-4" />
      </button>

      {/* Dropdown Container */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer border-none
            ${isOpen ? 'bg-slate-700/60 text-white' : 'bg-slate-700/30 text-slate-200 hover:bg-slate-700/50'}`}
        >
          <span className="truncate max-w-[120px] sm:max-w-none">{currentModel.name}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-72 origin-top-left rounded-2xl border border-slate-700/80 bg-[rgba(15,23,42,0.95)] p-2 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in duration-150 z-[100]">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Select Model
            </div>
            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model.id)
                    setIsOpen(false)
                  }}
                  className={`flex w-full flex-col gap-0.5 rounded-xl p-3 text-left transition-all cursor-pointer border-none
                    ${selectedModel === model.id 
                      ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/30' 
                      : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${selectedModel === model.id ? 'text-indigo-200' : ''}`}>
                        {model.name}
                      </span>
                      {model.warning && <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {model.badge && (
                        <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight
                          ${model.badge === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 
                            model.badge === 'New' ? 'bg-slate-700 text-slate-300' :
                            'bg-amber-500/10 text-amber-400'}`}>
                          {model.badge}
                        </span>
                      )}
                      {selectedModel === model.id && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                  </div>
                  <div className="text-[11px] opacity-60 font-medium line-clamp-1">{model.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan Button */}
      <button className="flex items-center gap-1.5 rounded-xl border border-slate-700/60 bg-slate-900/40 px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer group">
        <Zap className="h-3.5 w-3.5 fill-slate-500 text-slate-500 group-hover:fill-amber-400 group-hover:text-amber-400 transition-colors" />
        <span className="hidden sm:inline">Plan</span>
      </button>

      {/* Mic Button */}
      <button className="flex h-8 w-8 items-center justify-center rounded-xl bg-transparent text-slate-400 hover:bg-slate-700/50 hover:text-white transition-all cursor-pointer border-none">
        <Mic className="h-4 w-4" />
      </button>
    </div>
  )
}
