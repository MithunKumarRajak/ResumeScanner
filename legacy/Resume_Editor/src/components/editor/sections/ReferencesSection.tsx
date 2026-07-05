import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Reference } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function ReferencesSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempRef, setTempRef] = useState<Reference | null>(null);

  if (!resume) return null;
  const { references, referencesOnRequest } = resume.data;

  const handleEdit = (ref: Reference) => {
    setTempRef({ ...ref });
    setEditingId(ref.id);
    setExpandedId(ref.id);
  };

  const handleSave = () => {
    if (!tempRef) return;
    updateData({
      references: references.map((r) => (r.id === editingId ? tempRef : r)),
    });
    setEditingId(null);
    setTempRef(null);
    toast.success('Reference saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempRef(null);
  };

  const updateTemp = (field: keyof Reference, value: string) => {
    if (!tempRef) return;
    setTempRef({ ...tempRef, [field]: value });
  };

  const update = (id: string, field: keyof Reference, value: string) => {
    updateData({ references: references.map((r) => (r.id === id ? { ...r, [field]: value } : r)) });
  };
  const add = () => { const id = crypto.randomUUID(); updateData({ references: [...references, { id, name: '', title: '', company: '', email: '', phone: '' }] }); setExpandedId(id); toast.success('Reference added'); };
  const remove = (id: string) => { updateData({ references: references.filter((r) => r.id !== id) }); if (expandedId === id) setExpandedId(null); };
  const move = (index: number, dir: 'up' | 'down') => { const arr = [...references]; const swap = dir === 'up' ? index - 1 : index + 1; [arr[index], arr[swap]] = [arr[swap], arr[index]]; updateData({ references: arr }); };

  return (
    <div className="section-body">
      {/* Available on request toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>Available Upon Request</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Show "References available upon request" on resume instead</div>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={referencesOnRequest} onChange={(e) => updateData({ referencesOnRequest: e.target.checked })} />
          <span className="toggle-track" />
          <span className="toggle-thumb" />
        </label>
      </div>

      {!referencesOnRequest && (
        <>
          {references.map((ref, index) => {
            const isOpen = expandedId === ref.id;
            return (
              <div key={ref.id} className="entry-card">
                  <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : ref.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <GripVertical size={14} color="var(--text-muted)" />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.name || 'Reference Name'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                      {editingId === ref.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                          <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(ref); }}>Edit</button>
                      )}
                      <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                      <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                      <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === references.length - 1}><ChevronDown size={14} /></button>
                      <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(ref.id); }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="entry-body">
                      {editingId === ref.id ? (
                        <>
                          <div className="form-row">
                            <div className="form-group"><label>Full Name</label><input value={tempRef?.name} onChange={(e) => updateTemp('name', e.target.value)} placeholder="Jane Smith" /></div>
                            <div className="form-group"><label>Job Title</label><input value={tempRef?.title} onChange={(e) => updateTemp('title', e.target.value)} placeholder="Engineering Manager" /></div>
                          </div>
                          <div className="form-row">
                            <div className="form-group"><label>Company</label><input value={tempRef?.company} onChange={(e) => updateTemp('company', e.target.value)} placeholder="Acme Corp" /></div>
                            <div className="form-group"><label>Email</label><input type="email" value={tempRef?.email} onChange={(e) => updateTemp('email', e.target.value)} placeholder="jane@acme.com" /></div>
                          </div>
                          <div className="form-group"><label>Phone</label><input value={tempRef?.phone} onChange={(e) => updateTemp('phone', e.target.value)} placeholder="+1 555 000 0000" /></div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{ref.title}{ref.company ? ` @ ${ref.company}` : ''}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ref.email} {ref.phone && `· ${ref.phone}`}</div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            );
          })}
          <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Reference</button>
        </>
      )}
    </div>
  );
}
