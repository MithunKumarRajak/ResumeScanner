import { useState } from 'react';
import { Sparkles, X, RefreshCw, Check, ChevronRight, FileText, Target, Zap, BookOpen, MessageSquare, Trophy, Languages, Search } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import {
  generateSummary, improveBullets, tailorToJobDescription, checkATSScore,
  analyzeSkillGap, checkGrammar, generateCoverLetter, suggestAchievements,
  rewriteTone, generateInterviewQuestions
} from '../../lib/aiService';
import toast from 'react-hot-toast';

type Tool = 'summary' | 'bullets' | 'tailor' | 'ats' | 'skillgap' | 'grammar' | 'coverletter' | 'achievements' | 'tone' | 'interview';

const TOOLS: { id: Tool; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'summary', label: 'Generate Summary', icon: <FileText size={16} />, desc: '3 professional summary variants' },
  { id: 'bullets', label: 'Improve Bullets', icon: <Zap size={16} />, desc: 'Strengthen job description bullets' },
  { id: 'tailor', label: 'Tailor to Job', icon: <Target size={16} />, desc: 'Match resume to a job description' },
  { id: 'ats', label: 'ATS Score Check', icon: <Search size={16} />, desc: 'Keyword match + missing terms' },
  { id: 'skillgap', label: 'Skill Gap Analysis', icon: <BookOpen size={16} />, desc: 'Skills to add for target role' },
  { id: 'grammar', label: 'Grammar & Clarity', icon: <Check size={16} />, desc: 'Fix passive voice & vague language' },
  { id: 'coverletter', label: 'Cover Letter', icon: <MessageSquare size={16} />, desc: 'Tailored cover letter' },
  { id: 'achievements', label: 'Achievement Ideas', icon: <Trophy size={16} />, desc: 'Quantifiable achievement bullets' },
  { id: 'tone', label: 'Rewrite Tone', icon: <Languages size={16} />, desc: 'Formal / Conversational / Confident' },
  { id: 'interview', label: 'Interview Prep', icon: <Sparkles size={16} />, desc: '12 likely interview questions' },
];

export default function AIToolsModal({ onClose }: { onClose: () => void }) {
  const { getActiveResume, updateData, apiKey } = useResumeStore();
  const resume = getActiveResume();
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [jd, setJd] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tone, setTone] = useState<'formal' | 'conversational' | 'confident'>('confident');
  const [industry, setIndustry] = useState('Technology');
  const [streamResult, setStreamResult] = useState('');

  if (!resume) return null;

  const runTool = async () => {
    if (!apiKey) { toast.error('Add your Claude API key in Settings (⚙ icon) first'); return; }
    setLoading(true); setResult(''); setStreamResult('');

    const onChunk = (chunk: string) => setStreamResult((prev) => prev + chunk);

    try {
      let res = '';
      const { data } = resume;
      switch (activeTool) {
        case 'summary': res = await generateSummary(apiKey, data.personalInfo.title, data.skills.map(s => s.name), onChunk); break;
        case 'bullets': res = await improveBullets(apiKey, data.experience.map(e => e.description).join('\n---\n'), data.personalInfo.title, onChunk); break;
        case 'tailor': res = await tailorToJobDescription(apiKey, data, jd, onChunk); break;
        case 'ats': res = await checkATSScore(apiKey, data, jd, onChunk); break;
        case 'skillgap': res = await analyzeSkillGap(apiKey, data.skills.map(s => s.name), jd, onChunk); break;
        case 'grammar': res = await checkGrammar(apiKey, `${data.summary}\n${data.experience.map(e => e.description).join('\n')}`, onChunk); break;
        case 'coverletter': res = await generateCoverLetter(apiKey, data, jd, companyName, onChunk); break;
        case 'achievements': res = await suggestAchievements(apiKey, data.personalInfo.title, industry, onChunk); break;
        case 'tone': res = await rewriteTone(apiKey, data.summary, tone, onChunk); break;
        case 'interview': res = await generateInterviewQuestions(apiKey, data, onChunk); break;
      }
      setResult(res);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI request failed');
    } finally {
      setLoading(false); setStreamResult('');
    }
  };

  const applyToResume = () => {
    if (!result || !activeTool) return;
    if (activeTool === 'tone') {
      updateData({ summary: result });
      toast.success('Tone applied to summary!');
    } else if (activeTool === 'summary') {
      const firstOpt = result.split(/\*\*Option \d+:\*\*/gi).filter(s => s.trim().length > 10)[0];
      if (firstOpt) { updateData({ summary: firstOpt.trim() }); toast.success('First summary option applied!'); }
    }
  };

  const needsJD = ['tailor', 'ats', 'skillgap', 'coverletter'].includes(activeTool || '');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: '88vh' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--ai-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={16} color="var(--ai-color)" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>AI Resume Tools</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Powered by Claude AI · Add API key in Settings</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Tool List */}
          <div style={{ width: 220, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 12, flexShrink: 0 }}>
            {TOOLS.map((tool) => (
              <button
                key={tool.id}
                onClick={() => { setActiveTool(tool.id); setResult(''); setStreamResult(''); }}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  background: activeTool === tool.id ? 'var(--ai-light)' : 'transparent',
                  border: `1px solid ${activeTool === tool.id ? 'color-mix(in srgb, var(--ai-color) 30%, transparent)' : 'transparent'}`,
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4, transition: 'all 0.15s',
                }}
              >
                <span style={{ color: 'var(--ai-color)', marginTop: 1, flexShrink: 0 }}>{tool.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: activeTool === tool.id ? 'var(--ai-color)' : 'var(--text-primary)' }}>{tool.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Tool Content */}
          <div className="modal-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {!activeTool ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                <Sparkles size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 15 }}>Select a tool from the left panel</p>
                <p style={{ fontSize: 13 }}>Each tool uses Claude AI to enhance your resume</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {TOOLS.find(t => t.id === activeTool)?.label}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{TOOLS.find(t => t.id === activeTool)?.desc}</p>
                </div>

                {/* Tool-specific inputs */}
                {needsJD && (
                  <div className="form-group">
                    <label>Job Description {activeTool === 'coverletter' && '& Company'}</label>
                    {activeTool === 'coverletter' && (
                      <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company Name" style={{ marginBottom: 6 }} />
                    )}
                    <textarea rows={6} value={jd} onChange={e => setJd(e.target.value)} placeholder="Paste the full job description here..." />
                  </div>
                )}
                {activeTool === 'tone' && (
                  <div className="form-group">
                    <label>Target Tone</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['formal', 'conversational', 'confident'] as const).map((t) => (
                        <button key={t} onClick={() => setTone(t)} style={{
                          flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                          border: `1.5px solid ${tone === t ? 'var(--ai-color)' : 'var(--border)'}`,
                          background: tone === t ? 'var(--ai-light)' : 'var(--bg-card)',
                          color: tone === t ? 'var(--ai-color)' : 'var(--text-secondary)', fontWeight: tone === t ? 600 : 400,
                        }}>{t}</button>
                      ))}
                    </div>
                  </div>
                )}
                {activeTool === 'achievements' && (
                  <div className="form-group">
                    <label>Industry</label>
                    <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Technology, Healthcare, Finance" />
                  </div>
                )}

                <button className="btn btn-primary" onClick={runTool} disabled={loading || (needsJD && !jd.trim())} style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}>
                  {loading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {loading ? 'Generating...' : 'Generate with AI'}
                </button>

                {/* Result */}
                {(result || streamResult) && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-color)' }}>✨ AI Result</span>
                      {['summary', 'tone'].includes(activeTool) && result && (
                        <button className="btn btn-primary btn-sm" onClick={applyToResume} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={12} /> Apply to Resume
                        </button>
                      )}
                    </div>
                    <div className="ai-result" style={{ flex: 1, overflowY: 'auto', maxHeight: 320 }}>
                      {result || streamResult}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { navigator.clipboard.writeText(result || streamResult); toast.success('Copied!'); }}>Copy</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setResult(''); setStreamResult(''); }}>Clear</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
