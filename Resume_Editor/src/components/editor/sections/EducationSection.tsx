import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Education } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function EducationSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempEdu, setTempEdu] = useState<Education | null>(null);

  if (!resume) return null;
  const education = resume.data.education;

  const handleEdit = (edu: Education) => {
    setTempEdu({ ...edu });
    setEditingId(edu.id);
    setExpandedId(edu.id);
  };

  const handleSave = () => {
    if (!tempEdu) return;
    updateData({
      education: education.map((e) => (e.id === editingId ? tempEdu : e)),
    });
    setEditingId(null);
    setTempEdu(null);
    toast.success('Education saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempEdu(null);
  };

  const updateTemp = (field: keyof Education, value: string) => {
    if (!tempEdu) return;
    setTempEdu({ ...tempEdu, [field]: value });
  };

  const update = (id: string, field: keyof Education, value: string) => {
    updateData({ education: education.map((e) => (e.id === id ? { ...e, [field]: value } : e)) });
  };

  const add = () => {
    const id = crypto.randomUUID();
    updateData({ education: [...education, { id, degree: '', institution: '', fieldOfStudy: '', graduationYear: '', startYear: '', gpa: '', honors: '' }] });
    setExpandedId(id);
    toast.success('Education added');
  };

  const remove = (id: string) => {
    updateData({ education: education.filter((e) => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const move = (index: number, dir: 'up' | 'down') => {
    const arr = [...education];
    const swap = dir === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    updateData({ education: arr });
  };

  return (
    <div className="section-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {education.map((edu, index) => {
          const isOpen = expandedId === edu.id;
          return (
            <div key={edu.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : edu.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {edu.degree || 'Degree'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === edu.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(edu); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === education.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(edu.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
              {isOpen && (
                <div className="entry-body">
                  {editingId === edu.id ? (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Degree</label>
                          <input value={tempEdu?.degree} onChange={(e) => updateTemp('degree', e.target.value)} placeholder="Bachelor of Science" />
                        </div>
                        <div className="form-group">
                          <label>Field of Study</label>
                          <input value={tempEdu?.fieldOfStudy} onChange={(e) => updateTemp('fieldOfStudy', e.target.value)} placeholder="Computer Science" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Institution</label>
                        <input value={tempEdu?.institution} onChange={(e) => updateTemp('institution', e.target.value)} placeholder="MIT" />
                      </div>
                      <div className="form-row-3">
                        <div className="form-group">
                          <label>Start Year</label>
                          <input value={tempEdu?.startYear || ''} onChange={(e) => updateTemp('startYear', e.target.value)} placeholder="2019" />
                        </div>
                        <div className="form-group">
                          <label>Grad Year</label>
                          <input value={tempEdu?.graduationYear} onChange={(e) => updateTemp('graduationYear', e.target.value)} placeholder="2023" />
                        </div>
                        <div className="form-group">
                          <label>GPA</label>
                          <input value={tempEdu?.gpa || ''} onChange={(e) => updateTemp('gpa', e.target.value)} placeholder="3.8" />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Honors / Awards</label>
                        <input value={tempEdu?.honors || ''} onChange={(e) => updateTemp('honors', e.target.value)} placeholder="Magna Cum Laude" />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{edu.institution || 'Institution'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {edu.startYear && `${edu.startYear} – `}{edu.graduationYear} {edu.gpa && `· GPA: ${edu.gpa}`}
                      </div>
                      {edu.honors && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{edu.honors}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <Plus size={14} /> Add Education
      </button>
    </div>
  );
}
