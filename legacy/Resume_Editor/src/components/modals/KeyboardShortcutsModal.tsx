import { X } from 'lucide-react';

export default function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { keys: ['Ctrl', 'Z'], desc: 'Undo last change' },
    { keys: ['Ctrl', 'Y'], desc: 'Redo' },
    { keys: ['Ctrl', 'S'], desc: 'Save snapshot' },
    { keys: ['Ctrl', 'P'], desc: 'Print / Export PDF' },
    { keys: ['?'], desc: 'Open keyboard shortcuts' },
    { keys: ['D'], desc: 'Toggle dark/light mode' },
  ];

  const Key = ({ k }: { k: string }) => (
    <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace', fontWeight: 600, background: 'var(--bg-app)', border: '1px solid var(--border)', boxShadow: '0 2px 0 var(--border)', color: 'var(--text-primary)' }}>{k}</kbd>
  );

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>⌨️ Keyboard Shortcuts</h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shortcuts.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-app)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{s.desc}</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {s.keys.map((k, j) => (
                    <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      {j > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+</span>}
                      <Key k={k} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
