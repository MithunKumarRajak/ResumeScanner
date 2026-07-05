import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Award } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function AwardsSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempAward, setTempAward] = useState<Award | null>(null);

  if (!resume) return null;
  const awards = resume.data.awards;

  const handleEdit = (award: Award) => {
    setTempAward({ ...award });
    setEditingId(award.id);
    setExpandedId(award.id);
  };

  const handleSave = () => {
    if (!tempAward) return;
    updateData({
      awards: awards.map((a) => (a.id === editingId ? tempAward : a)),
    });
    setEditingId(null);
    setTempAward(null);
    toast.success('Award saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempAward(null);
  };

  const updateTemp = (field: keyof Award, value: string) => {
    if (!tempAward) return;
    setTempAward({ ...tempAward, [field]: value });
  };

  const update = (id: string, field: keyof Award, value: string) => {
    updateData({ awards: awards.map((a) => (a.id === id ? { ...a, [field]: value } : a)) });
  };
  const add = () => { const id = crypto.randomUUID(); updateData({ awards: [...awards, { id, title: '', issuer: '', date: '', description: '' }] }); setExpandedId(id); toast.success('Award added'); };
  const remove = (id: string) => { updateData({ awards: awards.filter((a) => a.id !== id) }); if (expandedId === id) setExpandedId(null); };
  const move = (index: number, dir: 'up' | 'down') => { const arr = [...awards]; const swap = dir === 'up' ? index - 1 : index + 1; [arr[index], arr[swap]] = [arr[swap], arr[index]]; updateData({ awards: arr }); };

  return (
    <div className="section-body">
      {awards.map((award, index) => {
        const isOpen = expandedId === award.id;
        return (
            <div key={award.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : award.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{award.title || 'Award Title'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === award.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(award); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === awards.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(award.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            {isOpen && (
              <div className="entry-body">
                {editingId === award.id ? (
                  <>
                    <div className="form-group"><label>Award Title</label><input value={tempAward?.title} onChange={(e) => updateTemp('title', e.target.value)} placeholder="Innovation Award" /></div>
                    <div className="form-row">
                      <div className="form-group"><label>Issuer/Organization</label><input value={tempAward?.issuer} onChange={(e) => updateTemp('issuer', e.target.value)} placeholder="TechCorp" /></div>
                      <div className="form-group"><label>Date</label><input value={tempAward?.date} onChange={(e) => updateTemp('date', e.target.value)} placeholder="2023" /></div>
                    </div>
                    <div className="form-group"><label>Description (optional)</label><textarea rows={2} value={tempAward?.description || ''} onChange={(e) => updateTemp('description', e.target.value)} placeholder="Brief description of the award..." /></div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{award.issuer}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{award.date}</div>
                    {award.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{award.description}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Award</button>
    </div>
  );
}
