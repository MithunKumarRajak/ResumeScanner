import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Publication } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function PublicationsSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPub, setTempPub] = useState<Publication | null>(null);

  if (!resume) return null;
  const publications = resume.data.publications;

  const handleEdit = (pub: Publication) => {
    setTempPub({ ...pub });
    setEditingId(pub.id);
    setExpandedId(pub.id);
  };

  const handleSave = () => {
    if (!tempPub) return;
    updateData({
      publications: publications.map((p) => (p.id === editingId ? tempPub : p)),
    });
    setEditingId(null);
    setTempPub(null);
    toast.success('Publication saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempPub(null);
  };

  const updateTemp = (field: keyof Publication, value: string) => {
    if (!tempPub) return;
    setTempPub({ ...tempPub, [field]: value });
  };

  const update = (id: string, field: keyof Publication, value: string) => {
    updateData({ publications: publications.map((p) => (p.id === id ? { ...p, [field]: value } : p)) });
  };
  const add = () => { const id = crypto.randomUUID(); updateData({ publications: [...publications, { id, title: '', journal: '', date: '', doiUrl: '' }] }); setExpandedId(id); toast.success('Publication added'); };
  const remove = (id: string) => { updateData({ publications: publications.filter((p) => p.id !== id) }); if (expandedId === id) setExpandedId(null); };
  const move = (index: number, dir: 'up' | 'down') => { const arr = [...publications]; const swap = dir === 'up' ? index - 1 : index + 1; [arr[index], arr[swap]] = [arr[swap], arr[index]]; updateData({ publications: arr }); };

  return (
    <div className="section-body">
      {publications.map((pub, index) => {
        const isOpen = expandedId === pub.id;
        return (
            <div key={pub.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : pub.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.title || 'Publication Title'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === pub.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(pub); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === publications.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(pub.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            {isOpen && (
              <div className="entry-body">
                {editingId === pub.id ? (
                  <>
                    <div className="form-group"><label>Title</label><input value={tempPub?.title} onChange={(e) => updateTemp('title', e.target.value)} placeholder="Paper or Article Title" /></div>
                    <div className="form-row">
                      <div className="form-group"><label>Journal / Conference</label><input value={tempPub?.journal} onChange={(e) => updateTemp('journal', e.target.value)} placeholder="Nature, NeurIPS, etc." /></div>
                      <div className="form-group"><label>Date</label><input value={tempPub?.date} onChange={(e) => updateTemp('date', e.target.value)} placeholder="2023" /></div>
                    </div>
                    <div className="form-group"><label>DOI / URL</label><input value={tempPub?.doiUrl || ''} onChange={(e) => updateTemp('doiUrl', e.target.value)} placeholder="doi.org/10.000/..." /></div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{pub.journal}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pub.date}</div>
                    {pub.doiUrl && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{pub.doiUrl}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Publication</button>
    </div>
  );
}
