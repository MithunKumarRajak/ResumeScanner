import { Sun, Moon, Download, Sparkles, Settings, Clock, Undo2, Redo2, LayoutDashboard, Smartphone, Monitor, Save } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import toast from 'react-hot-toast';

interface AppHeaderProps {
  onExport: () => void;
  onAITools: () => void;
  onSettings: () => void;
  onVersionHistory: () => void;
  onShortcuts: () => void;
  onATS: () => void;
  onDashboard: () => void;
}

export default function AppHeader({ onExport, onAITools, onSettings, onVersionHistory, onShortcuts, onATS, onDashboard }: AppHeaderProps) {
  const { theme, setTheme, undo, redo, undoStack, redoStack, getActiveResume, saveSnapshot, mobileTab, setMobileTab, activeView } = useResumeStore();
  const resume = getActiveResume();

  const handleSave = () => {
    saveSnapshot('Manual save');
    toast.success('Snapshot saved!', { icon: '💾' });
  };

  return (
    <header className="app-header">
      {/* Left: Brand + Dashboard */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onDashboard} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>ResumePro</span>
        </button>

        {activeView === 'editor' && resume && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button className="btn-icon" title="Dashboard" onClick={onDashboard}><LayoutDashboard size={15} /></button>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {resume.name}
            </span>
          </>
        )}
      </div>

      {/* Center: Mobile Tab (small screens) */}
      {activeView === 'editor' && (
        <div className="mobile-tab-bar" style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setMobileTab('edit')}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: mobileTab === 'edit' ? 'var(--accent)' : 'var(--border)', background: mobileTab === 'edit' ? 'var(--accent-light)' : 'transparent', color: mobileTab === 'edit' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: mobileTab === 'preview' ? 'var(--accent)' : 'var(--border)', background: mobileTab === 'preview' ? 'var(--accent-light)' : 'transparent', color: mobileTab === 'preview' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            👁 Preview
          </button>
        </div>
      )}

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {activeView === 'editor' && (
          <>
            <button className="btn-icon" onClick={() => undo()} disabled={undoStack.length === 0} title="Undo (Ctrl+Z)" style={{ opacity: undoStack.length === 0 ? 0.4 : 1 }}>
              <Undo2 size={16} />
            </button>
            <button className="btn-icon" onClick={() => redo()} disabled={redoStack.length === 0} title="Redo (Ctrl+Y)" style={{ opacity: redoStack.length === 0 ? 0.4 : 1 }}>
              <Redo2 size={16} />
            </button>
            <button className="btn-icon" onClick={handleSave} title="Save Snapshot (Ctrl+S)">
              <Save size={16} />
            </button>
            <button className="btn-icon" onClick={onVersionHistory} title="Version History">
              <Clock size={16} />
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
            <button className="btn btn-sm" onClick={onATS} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(99, 102, 241, 0.05)', color: 'var(--accent)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <Target size={13} /> ATS Score
            </button>
            <button className="btn btn-sm" onClick={onAITools} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--ai-light)', color: 'var(--ai-color)', border: '1px solid color-mix(in srgb, var(--ai-color) 30%, transparent)' }}>
              <Sparkles size={13} /> AI Tools
            </button>
            <button className="btn btn-primary btn-sm" onClick={onExport} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Download size={13} /> Export
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          </>
        )}

        <button className="btn-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme (D)">
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <button className="btn-icon" onClick={onSettings} title="Settings">
          <Settings size={16} />
        </button>
        <button className="btn-icon" onClick={onShortcuts} title="Keyboard shortcuts (?)">
          <span style={{ fontSize: 13, fontWeight: 700, width: 18, textAlign: 'center' }}>?</span>
        </button>
      </div>
    </header>
  );
}
