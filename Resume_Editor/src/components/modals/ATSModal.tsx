import { useState } from 'react';
import { X, Sparkles, Loader2, Target, CheckCircle2, AlertCircle, ChevronRight, BarChart3 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { calculateATSScore } from '../../lib/aiService';
import toast from 'react-hot-toast';

export default function ATSModal({ onClose }: { onClose: () => void }) {
  const { getActiveResume, apiKey } = useResumeStore();
  const resume = getActiveResume();
  const [jd, setJd] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    matchingSkills: string[];
    missingSkills: string[];
    suggestions: string[];
    roleMatch: string;
  } | null>(null);

  const handleAnalyze = async () => {
    if (!jd.trim()) {
      toast.error('Please paste a job description first');
      return;
    }
    if (!apiKey) {
      toast.error('Add your Claude API key in Settings to use ATS analysis');
      return;
    }
    if (!resume) return;

    setIsAnalyzing(true);
    try {
      const data = await calculateATSScore(apiKey, resume.data, jd);
      setResult(data);
      toast.success('Analysis complete! ✨');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !isAnalyzing && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 800 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={20} color="var(--accent)" />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>ATS Compatibility Scanner</h2>
          </div>
          <button className="btn-icon" onClick={onClose} disabled={isAnalyzing}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {!result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '16px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Paste the <strong>Job Description</strong> from the company's website. Our AI will analyze your resume against these specific requirements and give you a compatibility score.
                </p>
              </div>
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here (responsibilities, requirements, etc.)..."
                style={{ minHeight: 350, fontSize: 13, lineHeight: 1.6 }}
                disabled={isAnalyzing}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Score Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '24px', background: 'var(--bg-app)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ position: 'relative', width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg style={{ transform: 'rotate(-90deg)', width: 80, height: 80 }}>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="6" />
                    <circle 
                      cx="40" cy="40" r="36" fill="none" stroke="var(--accent)" strokeWidth="6" 
                      strokeDasharray={2 * Math.PI * 36}
                      strokeDashoffset={2 * Math.PI * 36 * (1 - result.score / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span style={{ position: 'absolute', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{result.score}%</span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px' }}>Compatibility Score</h3>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{result.roleMatch}</p>
                </div>
                <button className="btn btn-ghost" onClick={() => setResult(null)} style={{ fontSize: 12 }}>Scan Again</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Matching Skills */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--success)' }}>
                    <CheckCircle2 size={16} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Matching Keywords</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.matchingSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{s}</span>
                    ))}
                    {!result.matchingSkills.length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None identified</span>}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="card" style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--warning)' }}>
                    <AlertCircle size={16} />
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Critical Missing Skills</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.missingSkills.map(s => (
                      <span key={s} style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 8px', borderRadius: 6, fontWeight: 600 }}>{s}</span>
                    ))}
                    {!result.missingSkills.length && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Great coverage!</span>}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Sparkles size={16} color="var(--accent)" />
                  <span style={{ fontSize: 14, fontWeight: 700 }}>Optimization Suggestions</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.suggestions.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      <ChevronRight size={14} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={isAnalyzing}>Cancel</button>
          {!result && (
            <button 
              className="btn btn-primary" 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !jd.trim()}
              style={{ minWidth: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
              {isAnalyzing ? 'Analyzing...' : 'Scan Compatibility'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
