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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>
      <h2 style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Advanced — Advanced AI Features</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        Semantic matching · Bias detection · Explainable AI · Multilingual · Custom training
      </p>

      {/* Resume input (shared across tabs) */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: '0.4rem' }}>
          Resume Text
        </label>
        <textarea
          rows={5}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px',
                   border: '0.5px solid #ccc', fontSize: '0.85rem', fontFamily: 'inherit',
                   resize: 'vertical', boxSizing: 'border-box' }}
          placeholder="Paste resume text here (English or Hindi)..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '0.5px solid #ddd', paddingBottom: '0.5rem' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.4rem 0.9rem', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: activeTab === tab.id ? 500 : 400,
              background: activeTab === tab.id ? '#185FA5' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#555'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'analytics' && <AnalyticsTab />}
      
      {activeTab === 'match' && <SemanticMatchPanel resumeText={resumeText} />}
      
      {activeTab === 'bias' && (
        <div>
          <BiasCheckWidget resumeText={resumeText} />
        </div>
      )}
      
      {activeTab === 'finetune' && (
        <div style={{ padding: '1rem', background: '#f9f9f7', borderRadius: '10px' }}>
          <h3 style={{ fontWeight: 500, margin: '0 0 1rem' }}>🔧 Fine-tune Model on Company Data</h3>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
            Upload a CSV with columns <code>Resume</code> and <code>Category</code> to fine-tune the model on your company's hiring patterns.
          </p>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <input
              type="text"
              placeholder="Company name"
              value={ftCompany}
              onChange={(e) => setFtCompany(e.target.value)}
              style={{ padding: '0.6rem', borderRadius: '6px', border: '0.5px solid #ccc', fontSize: '0.85rem' }}
            />
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFtFile(e.target.files?.[0] || null)}
              style={{ fontSize: '0.85rem' }}
            />
            <button
              onClick={handleFineTune}
              disabled={!ftFile || !ftCompany}
              style={{
                padding: '0.6rem 1.2rem', background: '#185FA5', color: 'white',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
                fontWeight: 500, opacity: !ftFile || !ftCompany ? 0.5 : 1
              }}
            >
              Start Fine-tuning
            </button>
          </div>
          {ftStatus && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#EAF3DE',
                          color: '#3B6D11', borderRadius: '8px', fontSize: '0.85rem' }}>
               {ftStatus}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
