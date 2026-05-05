import { useState } from 'react'
import './SemanticMatchPanel.css'

interface MatchResult {
  semantic_score: number
  keyword_overlap_score: number
  combined_score: number
  matched_keywords: string[]
  missing_keywords: string[]
  model_used: string
  explanation?: {
    predicted_category: string
    confidence: number
    confidence_pct: number
    top_positive_features: Array<{ feature: string; shap_value: number }>
    explanation_summary: string
  }
  bias_flags?: string[]
  detected_language?: string
  analysis_id?: number
}

interface Props {
  resumeText: string
}

export default function SemanticMatchPanel({ resumeText }: Props) {
  const [jdText, setJdText] = useState('')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  const handleMatch = async () => {
    if (!jdText.trim() || !resumeText.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/phase3/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_text: resumeText,
          job_description: jdText,
          include_explanation: true,
          include_bias_check: true
        })
      })
      if (!res.ok) throw new Error(await res.text())
      setResult(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#3B6D11'
    if (score >= 50) return '#854F0B'
    return '#A32D2D'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return '#EAF3DE'
    if (score >= 50) return '#FAEEDA'
    return '#FCEBEB'
  }

  return (
    <div className="semantic-match-panel">
      <h3 className="panel-title">🧠 Semantic Job Match</h3>
      <p className="panel-subtitle">
        Paste a job description to get a deep semantic match score powered by multilingual AI.
      </p>

      <textarea
        className="jd-input"
        placeholder="Paste Job Description here..."
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        rows={6}
      />

      {/* Language badge */}
      {result?.detected_language && (
        <div className="lang-badge">
          🌐 Resume language: <strong>{result.detected_language === 'hi' ? 'Hindi' : 'English'}</strong>
        </div>
      )}

      <button className="match-btn" onClick={handleMatch} disabled={loading || !jdText.trim()}>
        {loading ? '⏳ Analyzing...' : '🔍 Run Semantic Match'}
      </button>

      {error && <div className="error-box">⚠️ {error}</div>}

      {result && (
        <div className="result-container">
          {/* Score cards */}
          <div className="score-grid">
            {[
              { label: 'Combined Score', value: result.combined_score, icon: '⭐' },
              { label: 'Semantic Match', value: result.semantic_score, icon: '🧠' },
              { label: 'Keyword Match', value: result.keyword_overlap_score, icon: '🔑' }
            ].map(({ label, value, icon }) => (
              <div key={label} className="score-card" style={{ background: getScoreBg(value) }}>
                <div className="score-icon">{icon}</div>
                <div className="score-value" style={{ color: getScoreColor(value) }}>
                  {value.toFixed(1)}%
                </div>
                <div className="score-label">{label}</div>
                <div className="score-bar-track">
                  <div
                    className="score-bar-fill"
                    style={{ width: `${value}%`, background: getScoreColor(value) }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bias flags */}
          {result.bias_flags && result.bias_flags.length > 0 && (
            <div className="bias-alert">
              <span className="bias-icon">⚖️</span>
              <div>
                <strong>Bias Indicators Detected</strong>
                <p>This resume contains: {result.bias_flags.join(', ')}. Consider blind review.</p>
              </div>
            </div>
          )}

          {/* Keywords */}
          <div className="keywords-section">
            <div className="keywords-col">
              <h4>✅ Matched Keywords ({result.matched_keywords.length})</h4>
              <div className="keyword-chips">
                {result.matched_keywords.slice(0, 15).map(k => (
                  <span key={k} className="chip chip-green">{k}</span>
                ))}
              </div>
            </div>
            <div className="keywords-col">
              <h4>❌ Missing Keywords ({result.missing_keywords.length})</h4>
              <div className="keyword-chips">
                {result.missing_keywords.slice(0, 15).map(k => (
                  <span key={k} className="chip chip-red">{k}</span>
                ))}
              </div>
            </div>
          </div>

          {/* XAI Explanation */}
          {result.explanation && !('error' in result.explanation) && (
            <div className="explanation-section">
              <button className="toggle-btn" onClick={() => setShowExplanation(!showExplanation)}>
                🔎 {showExplanation ? 'Hide' : 'Show'} AI Explanation
              </button>
              {showExplanation && (
                <div className="explanation-box">
                  <p className="explanation-summary">{result.explanation.explanation_summary}</p>
                  <div className="feature-importance">
                    <h5>Top Contributing Factors</h5>
                    {result.explanation.top_positive_features.slice(0, 8).map((f, i) => (
                      <div key={i} className="feature-row">
                        <span className="feature-name">{f.feature}</span>
                        <div className="feature-bar-track">
                          <div
                            className="feature-bar-fill"
                            style={{
                              width: `${Math.min(Math.abs(f.shap_value) * 500, 100)}%`,
                              background: f.shap_value > 0 ? '#3B6D11' : '#A32D2D'
                            }}
                          />
                        </div>
                        <span className="feature-val" style={{ color: f.shap_value > 0 ? '#3B6D11' : '#A32D2D' }}>
                          {f.shap_value > 0 ? '+' : ''}{f.shap_value.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="confidence-badge">
                    Predicted: <strong>{result.explanation.predicted_category}</strong>
                    &nbsp;({result.explanation.confidence_pct}% confidence)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
