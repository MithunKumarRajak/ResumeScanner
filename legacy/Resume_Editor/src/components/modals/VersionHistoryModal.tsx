import { useState } from 'react';
import { X, Clock, RotateCcw, Trash2 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function VersionHistoryModal({ onClose }: { onClose: () => void }) {
  const { versionHistory, restoreSnapshot, getActiveResume, saveSnapshot } = useResumeStore();
  const resume = getActiveResume();
  const [restoring, setRestoring] = useState<string | null>(null);

  const myHistory = versionHistory.filter((v) => v.resumeId === resume?.id);

  const handleRestore = (id: string) => {
    setRestoring(id);
    restoreSnapshot(id);
    toast.success('Version restored!');
    setRestoring(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-md">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} color="var(--accent)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Version History</h2>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              {myHistory.length} saved snapshot{myHistory.length !== 1 ? 's' : ''} for this resume
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => { saveSnapshot('Manual save'); toast.success('Snapshot saved!'); }}>
              + Save Now
            </button>
          </div>
          {myHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <Clock size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No snapshots yet. Snapshots are saved every 5 minutes automatically, or click "Save Now".</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myHistory.map((snap) => (
                <div key={snap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{snap.label || 'Auto-save'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {format(new Date(snap.timestamp), 'MMM d, yyyy h:mm a')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Template: {snap.style.template}</div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRestore(snap.id)}
                    disabled={restoring === snap.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <p style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>Snapshots are stored in your browser and kept for up to 50 versions.</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
