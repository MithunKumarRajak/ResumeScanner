import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Certification } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function CertificationsSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempCert, setTempCert] = useState<Certification | null>(null);

  if (!resume) return null;
  const certs = resume.data.certifications;

  const handleEdit = (cert: Certification) => {
    setTempCert({ ...cert });
    setEditingId(cert.id);
    setExpandedId(cert.id);
  };

  const handleSave = () => {
    if (!tempCert) return;
    updateData({
      certifications: certs.map((c) => (c.id === editingId ? tempCert : c)),
    });
    setEditingId(null);
    setTempCert(null);
    toast.success('Certification saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempCert(null);
  };

  const updateTemp = (field: keyof Certification, value: string) => {
    if (!tempCert) return;
    setTempCert({ ...tempCert, [field]: value });
  };

  const update = (id: string, field: keyof Certification, value: string) => {
    updateData({ certifications: certs.map((c) => (c.id === id ? { ...c, [field]: value } : c)) });
  };
  const add = () => {
    const id = crypto.randomUUID();
    updateData({ certifications: [...certs, { id, name: '', issuer: '', date: '', credentialUrl: '', expiryDate: '' }] });
    setExpandedId(id); toast.success('Certification added');
  };
  const remove = (id: string) => { updateData({ certifications: certs.filter((c) => c.id !== id) }); if (expandedId === id) setExpandedId(null); };
  const move = (index: number, dir: 'up' | 'down') => { const arr = [...certs]; const swap = dir === 'up' ? index - 1 : index + 1; [arr[index], arr[swap]] = [arr[swap], arr[index]]; updateData({ certifications: arr }); };

  return (
    <div className="section-body">
      {certs.map((cert, index) => {
        const isOpen = expandedId === cert.id;
        return (
            <div key={cert.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : cert.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cert.name || 'Certification Name'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === cert.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(cert); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === certs.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(cert.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
            {isOpen && (
              <div className="entry-body">
                {editingId === cert.id ? (
                  <>
                    <div className="form-group"><label>Certification Name</label><input value={tempCert?.name} onChange={(e) => updateTemp('name', e.target.value)} placeholder="AWS Solutions Architect" /></div>
                    <div className="form-row">
                      <div className="form-group"><label>Issuing Organization</label><input value={tempCert?.issuer} onChange={(e) => updateTemp('issuer', e.target.value)} placeholder="Amazon Web Services" /></div>
                      <div className="form-group"><label>Issue Date</label><input value={tempCert?.date} onChange={(e) => updateTemp('date', e.target.value)} placeholder="2023" /></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label>Credential URL</label><input value={tempCert?.credentialUrl || ''} onChange={(e) => updateTemp('credentialUrl', e.target.value)} placeholder="verify.aws.com/..." /></div>
                      <div className="form-group"><label>Expiry Date</label><input value={tempCert?.expiryDate || ''} onChange={(e) => updateTemp('expiryDate', e.target.value)} placeholder="2026 (optional)" /></div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{cert.issuer}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cert.date}{cert.expiryDate ? ` · Expires: ${cert.expiryDate}` : ''}</div>
                    {cert.credentialUrl && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>{cert.credentialUrl}</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> Add Certification</button>
    </div>
  );
}
