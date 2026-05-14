import { useState } from 'react'
import SemanticMatchPanel from '../components/SemanticMatchPanel'
import BiasCheckWidget from '../components/BiasCheckWidget'
import AnalyticsTab from '../components/AnalyticsTab'

export default function AdvancedDashboard() {
  const [activeTab, setActiveTab] = useState<'match' | 'bias' | 'finetune' | 'analytics'>('analytics')
  const [resumeText, setResumeText] = useState('')
  const [ftCompany, setFtCompany] = useState('')
  const [ftFile, setFtFile] = useState<File | null>(null)
  const [ftStatus, setFtStatus] = useState<string | null>(null)

  const handleFineTune = async () => {
    if (!ftFile || !ftCompany) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = btoa(e.target?.result as string)
      const res = await fetch('/api/v1/advanced/fine-tune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: ftCompany, csv_base64: base64, epochs: 5 })
      })
      const data = await res.json()
      setFtStatus(data.message)
    }
    reader.readAsBinaryString(ftFile)
  }

  const tabs = [
    { id: 'analytics', label: '📊 System Analytics' },
    { id: 'match', label: '🧠 Semantic Match' },
    { id: 'bias', label: '⚖️ Bias Check' },
    { id: 'finetune', label: '🔧 Custom Training' }
  ] as const

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Advanced AI Features</h2>
        <p className="text-sm text-slate-400">
          Semantic matching · Bias detection · Explainable AI · Multilingual · Custom training
        </p>
      </div>

      {/* Resume input (shared across tabs) */}
      <div className="glass-card p-5 mb-8">
        <label className="mb-2 block text-sm font-semibold text-slate-300">
          Live Resume Context
        </label>
        <textarea
          rows={4}
          className="w-full rounded-xl border border-slate-700/60 bg-slate-900/50 p-4 text-sm text-slate-300 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-colors"
          placeholder="Paste resume text here to run live semantic or bias checks..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-800/60 pb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-inner'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-slide-up">
        {activeTab === 'analytics' && <AnalyticsTab />}
        
        {activeTab === 'match' && <SemanticMatchPanel resumeText={resumeText} />}
        
        {activeTab === 'bias' && (
          <div>
            <BiasCheckWidget resumeText={resumeText} />
          </div>
        )}
        
        {activeTab === 'finetune' && (
          <div className="glass-card p-6">
            <h3 className="mb-2 text-lg font-bold text-white">🔧 Fine-tune Model on Company Data</h3>
            <p className="mb-6 text-sm text-slate-400">
              Upload a CSV with columns <code className="rounded bg-slate-800 px-1.5 py-0.5 text-indigo-300">Resume</code> and <code className="rounded bg-slate-800 px-1.5 py-0.5 text-indigo-300">Category</code> to fine-tune the model on your company's historical hiring patterns.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Acme Corp"
                    value={ftCompany}
                    onChange={(e) => setFtCompany(e.target.value)}
                    className="w-full rounded-lg border border-slate-700/60 bg-slate-900/50 p-2.5 text-sm text-slate-300 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Training Dataset (CSV)</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFtFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-500/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-400 hover:file:bg-indigo-500/20"
                  />
                </div>

                <button
                  onClick={handleFineTune}
                  disabled={!ftFile || !ftCompany}
                  className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Fine-tuning
                </button>
              </div>

              {ftStatus && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center h-fit">
                  <p className="text-sm font-medium text-emerald-400">{ftStatus}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
