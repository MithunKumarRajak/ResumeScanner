import { useState } from 'react';
import { Plus, Copy, Trash2, Edit3, FileText, Calendar } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ResumeDashboard() {
  const { resumes, createResume, cloneResume, deleteResume, openResume, renameResume } = useResumeStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    const name = newName.trim() || `Resume ${resumes.length + 1}`;
    const id = createResume(name);
    openResume(id);
    setNewName('');
    toast.success(`"${name}" created!`);
  };

  const handleRename = (id: string) => {
    if (editName.trim()) {
      renameResume(id, editName.trim());
      toast.success('Renamed!');
    }
    setEditingId(null);
    setEditName('');
  };

  const TEMPLATE_COLORS: Record<string, string> = {
    modern: '#6366f1', classic: '#3b82f6', minimal: '#10b981', creative: '#ec4899',
    executive: '#0f172a', tech: '#1e293b', academic: '#7c3aed', 'two-column': '#f59e0b',
    infographic: '#06b6d4', 'ats-safe': '#64748b',
  };
  const TEMPLATE_EMOJIS: Record<string, string> = {
    modern: '⚡', classic: '📄', minimal: '🌿', creative: '🎨',
    executive: '👔', tech: '💻', academic: '🎓', 'two-column': '⬜',
    infographic: '📊', 'ats-safe': '🤖',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-app)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-heading)', marginBottom: 6 }}>
            ✨ My Resumes
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Create, manage, and export your professional resumes</p>
        </div>

        {/* Create New */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="New resume name..."
            style={{ flex: 1, maxWidth: 320 }}
          />
          <button className="btn btn-primary" onClick={handleCreate} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Create Resume
          </button>
        </div>

        {/* Resume Grid */}
        {resumes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
            <FileText size={60} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No resumes yet</h3>
            <p style={{ fontSize: 14 }}>Create your first resume to get started</p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {resumes.map((r) => {
              const color = TEMPLATE_COLORS[r.style.template] || '#6366f1';
              const emoji = TEMPLATE_EMOJIS[r.style.template] || '📄';
              return (
                <div key={r.id} className="resume-card" onClick={() => openResume(r.id)}>
                  {/* Preview thumbnail */}
                  <div className="resume-card-preview" style={{ background: `linear-gradient(135deg, ${color}25 0%, ${color}08 100%)`, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 36 }}>{emoji}</div>
                    <div style={{ position: 'absolute', top: 10, right: 10 }}>
                      <span className="tag tag-muted" style={{ fontSize: 10 }}>{r.style.template}</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12 }}>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, ((r.data.experience.length > 0 ? 20 : 0) + (r.data.summary ? 15 : 0) + (r.data.skills.length > 0 ? 15 : 0) + (r.data.education.length > 0 ? 15 : 0) + (r.data.projects.length > 0 ? 15 : 0) + (r.data.personalInfo.fullName ? 20 : 0)))}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '14px 16px' }}>
                    {editingId === r.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleRename(r.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(r.id); if (e.key === 'Escape') { setEditingId(null); } }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', marginBottom: 6 }}
                      />
                    ) : (
                      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</h3>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                      <Calendar size={10} />
                      Updated {format(new Date(r.updatedAt), 'MMM d, yyyy')}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); openResume(r.id); }}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); setEditingId(r.id); setEditName(r.name); }}
                        title="Rename"
                        style={{ width: 30, height: 30 }}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); cloneResume(r.id); toast.success('Resume cloned!'); }}
                        title="Clone"
                        style={{ width: 30, height: 30 }}
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); if (confirm('Delete this resume?')) { deleteResume(r.id); toast.success('Deleted'); } }}
                        title="Delete"
                        style={{ width: 30, height: 30, color: 'var(--danger)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
