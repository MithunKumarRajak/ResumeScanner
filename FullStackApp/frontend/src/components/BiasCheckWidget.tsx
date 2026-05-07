import { useState } from 'react'

interface BiasResult {
  gender_indicators_found: string[]
  age_indicators_found: string[]
  bias_risk_flags: string[]
  recommendation: string
}

interface Props {
  resumeText: string
}

export default function BiasCheckWidget({ resumeText }: Props) {
  const [result, setResult] = useState<BiasResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/advanced/bias-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_text: resumeText })
      })
      setResult(await res.json())
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '1rem', background: '#f9f9f7', borderRadius: '10px', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>⚖️ Bias Check</span>
        <button
          onClick={runCheck}
          disabled={loading}
          style={{ fontSize: '0.8rem', padding: '4px 12px', border: '0.5px solid #ccc',
                   borderRadius: '6px', background: 'white', cursor: 'pointer' }}
        >
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
          <div style={{
            padding: '0.6rem 0.9rem', borderRadius: '8px',
            background: result.bias_risk_flags.length === 0 ? '#EAF3DE' : '#FAEEDA',
            color: result.bias_risk_flags.length === 0 ? '#3B6D11' : '#854F0B',
            marginBottom: '0.5rem'
          }}>
            {result.bias_risk_flags.length === 0 ? ' No bias indicators found' : `⚠️ ${result.bias_risk_flags.join(', ')}`}
          </div>
          <p style={{ color: '#666', margin: 0 }}>{result.recommendation}</p>
        </div>
      )}
    </div>
  )
}
