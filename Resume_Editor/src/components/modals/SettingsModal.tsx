import { useState } from 'react';
import { X, Key, Save, Moon, Sun, Trash2 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import toast from 'react-hot-toast';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const { apiKey, setApiKey, theme, setTheme, resumes, deleteResume } = useResumeStore();
  const [keyInput, setKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);

  const saveKey = () => {
    setApiKey(keyInput.trim());
    toast.success('API key saved locally');
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>⚙️ Settings</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Claude API Key */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Key size={14} color="var(--ai-color)" /> Claude API Key
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Required for AI features. Key stored only in your browser — never sent to any server except Anthropic's API directly.
              Get yours at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>console.anthropic.com</a>.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  style={{ paddingRight: 80 }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <button className="btn btn-primary btn-sm" onClick={saveKey} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Save size={13} /> Save
              </button>
              {apiKey && (
                <button className="btn btn-danger btn-sm" onClick={() => { setApiKey(''); setKeyInput(''); toast.success('API key removed'); }} style={{ flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            {apiKey && <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>✓ API key is set</p>}
          </div>

          {/* Theme */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Appearance</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['light', 'dark'] as const).map((t) => (
                <button key={t} onClick={() => setTheme(t)} style={{
                  flex: 1, padding: '12px', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                  border: `2px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
                  background: theme === t ? 'var(--accent-light)' : 'var(--bg-card)',
                  color: theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                  fontWeight: theme === t ? 600 : 400,
                }}>
                  {t === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)} Mode
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Data & Storage</h3>
            <div style={{ padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Stored resumes</span>
                <strong>{resumes.length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Storage location</span>
                <span style={{ color: 'var(--text-muted)' }}>Browser localStorage</span>
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              All resume data is saved in your browser. Export as JSON to backup, or import a JSON file to restore.
            </p>
          </div>

          {/* Import JSON */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Import Resume (JSON)</h3>
            <input type="file" accept=".json" onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const parsed = JSON.parse(reader.result as string);
                  // Basic validation
                  if (parsed.data && parsed.style) {
                    toast.success('Import not fully wired – use the JSON export and reimport through dashboard');
                  } else {
                    toast.error('Invalid resume JSON format');
                  }
                } catch { toast.error('Invalid JSON file'); }
              };
              reader.readAsText(file);
            }} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
