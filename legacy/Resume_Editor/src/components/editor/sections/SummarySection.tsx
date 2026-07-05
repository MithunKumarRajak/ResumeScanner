import { useState } from 'react';
import { Sparkles, RefreshCw, Check, ChevronDown } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import { generateSummary } from '../../../lib/aiService';
import toast from 'react-hot-toast';

export default function SummarySection() {
  const { getActiveResume, updateData, apiKey } = useResumeStore();
  const resume = getActiveResume();
  const [loading, setLoading] = useState(false);
  const [aiOptions, setAiOptions] = useState<string[]>([]);
  const [streamText, setStreamText] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  if (!resume) return null;

  const { summary, personalInfo, skills } = resume.data;
  const [isEditing, setIsEditing] = useState(false);
  const [tempSummary, setTempSummary] = useState(summary);

  const handleEdit = () => {
    setTempSummary(summary);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateData({ summary: tempSummary });
    setIsEditing(false);
    toast.success('Summary saved!');
  };

  const handleCancel = () => {
    setTempSummary(summary);
    setIsEditing(false);
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      toast.error('Add your Claude API key in Settings first');
      return;
    }
    setLoading(true);
    setStreamText('');
    setAiOptions([]);
    setShowOptions(true);
    try {
      let collected = '';
      await generateSummary(
        apiKey,
        personalInfo.title || 'Professional',
        skills.map((s) => s.name),
        (chunk) => {
          collected += chunk;
          setStreamText(collected);
        }
      );
      // Split into 3 options
      const opts = collected.split(/\*\*Option \d+:\*\*/gi).filter((s) => s.trim().length > 10);
      setAiOptions(opts.map((o) => o.trim()));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI error occurred');
    } finally {
      setLoading(false);
      setStreamText('');
    }
  };

  const applyOption = (text: string) => {
    setTempSummary(text);
    updateData({ summary: text });
    setShowOptions(false);
    setIsEditing(false);
    setAiOptions([]);
    toast.success('Summary applied!');
  };

  const charCount = summary.length;
  const charColor = charCount < 100 ? 'var(--warning)' : charCount > 400 ? 'var(--danger)' : 'var(--success)';

  return (
    <div className="section-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ margin: 0 }}>Professional Summary</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isEditing ? (
            <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
            </div>
          )}
          <button 
            className="btn-ai btn btn-sm" 
            onClick={handleGenerate} 
            disabled={loading} 
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {loading ? 'Thinking...' : '✨ AI Enhance'}
          </button>
        </div>
      </div>

      {isEditing ? (
        <textarea
          rows={5}
          value={tempSummary}
          onChange={(e) => setTempSummary(e.target.value)}
          placeholder="Write a brief professional summary..."
          autoFocus
        />
      ) : (
        <div style={{ 
          padding: '12px', 
          background: 'var(--bg-app)', 
          borderRadius: 8, 
          fontSize: 14, 
          lineHeight: 1.6,
          color: summary ? 'var(--text-primary)' : 'var(--text-muted)',
          fontStyle: summary ? 'normal' : 'italic',
          minHeight: 100,
          whiteSpace: 'pre-wrap'
        }}>
          {summary || 'No summary provided. Click edit or use AI to generate one.'}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          Tip: Focus on your unique value and years of experience.
        </p>
        <span style={{ fontSize: 11, color: charColor }}>{tempSummary.length} chars</span>
      </div>

      {/* AI Options Panel */}
      {showOptions && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ai-color)' }}>✨ AI Options — Click to Apply</span>
            <button className="btn-ghost btn btn-sm" onClick={() => setShowOptions(false)}>✕ Close</button>
          </div>
          {loading && !aiOptions.length ? (
            <div className="ai-result" style={{ minHeight: 80 }}>{streamText || <span className="animate-pulse">Generating...</span>}</div>
          ) : (
            aiOptions.map((opt, i) => (
              <div
                key={i}
                className="ai-result"
                style={{ cursor: 'pointer', border: '1px solid color-mix(in srgb, var(--ai-color) 40%, transparent)' }}
                onClick={() => applyOption(opt)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ai-color)' }}>Option {i + 1}</span>
                  <button className="btn btn-sm" style={{ background: 'var(--ai-color)', color: 'white', padding: '2px 8px', borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Check size={10} /> Use this
                  </button>
                </div>
                {opt}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
