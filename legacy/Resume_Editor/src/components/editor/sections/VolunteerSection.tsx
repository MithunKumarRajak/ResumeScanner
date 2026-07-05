import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Volunteer } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function VolunteerSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempVol, setTempVol] = useState<Volunteer | null>(null);

  if (!resume) return null;
  const volunteer = resume.data.volunteer;

  const handleEdit = (v: Volunteer) => {
    setTempVol({ ...v });
    setEditingId(v.id);
    setExpandedId(v.id);
  };

  const handleSave = () => {
    if (!tempVol) return;
    updateData({
      volunteer: volunteer.map((v) => (v.id === editingId ? tempVol : v)),
    });
    setEditingId(null);
    setTempVol(null);
    toast.success('Experience saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempVol(null);
  };

  const updateTemp = (field: keyof Volunteer, value: string) => {
    if (!tempVol) return;
    setTempVol({ ...tempVol, [field]: value });
  };

  const update = (id: string, field: keyof Volunteer, value: string) => {
    updateData({ volunteer: volunteer.map((v) => (v.id === id ? { ...v, [field]: value } : v)) });
  };
  const add = () => { const id = crypto.randomUUID(); updateData({ volunteer: [...volunteer, { id, organization: '', role: '', startDate: '', endDate: '', description: '' }] }); setExpandedId(id); toast.success('Volunteer experience added'); };
  const remove = (id: string) => { updateData({ volunteer: volunteer.filter((v) => v.id !== id) }); if (expandedId === id) setExpandedId(null); };
  const move = (index: number, dir: 'up' | 'down') => { const arr = [...volunteer]; const swap = dir === 'up' ? index - 1 : index + 1; [arr[index], arr[swap]] = [arr[swap], arr[index]]; updateData({ volunteer: arr }); };

  return (
    <div className="section-body">
      {volunteer.map((v, index) => {
        const isOpen = expandedId === v.id;
        return (
            <div key={v.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : v.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.role || 'Role'} {v.organization ? `@ ${v.organization}` : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === v.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(v); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === volunteer.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(v.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            {isOpen && (
              <div className="entry-body">
                {editingId === v.id ? (
                  <>
                    <div className="form-row">
                      <div className="form-group"><label>Organization</label><input value={tempVol?.organization} onChange={(e) => updateTemp('organization', e.target.value)} placeholder="Red Cross" /></div>
                      <div className="form-group"><label>Role</label><input value={tempVol?.role} onChange={(e) => updateTemp('role', e.target.value)} placeholder="Volunteer Coordinator" /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Start Date</label><input value={tempVol?.startDate} onChange={(e) => updateTemp('startDate', e.target.value)} placeholder="Jan 2020" /></div>
                      <div className="form-group"><label>End Date</label><input value={tempVol?.endDate} onChange={(e) => updateTemp('endDate', e.target.value)} placeholder="Present" /></div>
                    </div>
                    <div className="form-group"><label>Description</label><textarea rows={4} value={tempVol?.description} onChange={(e) => updateTemp('description', e.target.value)} placeholder="Describe your contributions..." /></div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.startDate}{v.endDate ? ` – ${v.endDate}` : ''}</div>
                    {v.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{v.description}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Volunteer Experience</button>
    </div>
  );
}
