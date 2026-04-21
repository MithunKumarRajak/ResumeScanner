import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Sparkles, RefreshCw, MapPin, Wifi } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import { improveBullets } from '../../../lib/aiService';
import type { WorkExperience } from '../../../types/resume';
import toast from 'react-hot-toast';

const STRONG_VERBS = ['led', 'developed', 'managed', 'created', 'designed', 'optimized', 'improved', 'architected', 'implemented', 'reduced', 'saved', 'achieved', 'launched', 'delivered', 'spearheaded', 'engineered', 'built', 'scaled', 'drove', 'shipped'];

function analyzeDesc(text: string) {
  const lower = text.toLowerCase();
  return {
    hasVerbs: STRONG_VERBS.some((v) => lower.includes(v)),
    hasMetrics: /\d+/.test(lower) || /%/.test(lower) || /\$[0-9]/.test(lower),
  };
}

export default function ExperienceSection() {
  const { getActiveResume, updateData, apiKey } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempExp, setTempExp] = useState<WorkExperience | null>(null);

  if (!resume) return null;
  const experience = resume.data.experience;

  const handleEdit = (exp: WorkExperience) => {
    setTempExp({ ...exp });
    setEditingId(exp.id);
    setExpandedId(exp.id);
  };

  const handleSave = () => {
    if (!tempExp) return;
    updateData({
      experience: experience.map((e) => (e.id === editingId ? tempExp : e)),
    });
    setEditingId(null);
    setTempExp(null);
    toast.success('Experience saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempExp(null);
  };

  const updateTemp = (field: keyof WorkExperience, value: string | boolean) => {
    if (!tempExp) return;
    setTempExp({ ...tempExp, [field]: value });
  };

  const update = (id: string, field: keyof WorkExperience, value: string | boolean) => {
    updateData({
      experience: experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    });
  };

  const add = () => {
    const id = crypto.randomUUID();
    updateData({
      experience: [...experience, { id, company: '', title: '', startDate: '', endDate: '', location: '', remote: false, description: '' }],
    });
    setExpandedId(id);
    toast.success('New experience added');
  };

  const remove = (id: string) => {
    updateData({ experience: experience.filter((e) => e.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const move = (index: number, dir: 'up' | 'down') => {
    const arr = [...experience];
    const swap = dir === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    updateData({ experience: arr });
  };

  const improveWithAI = async (exp: WorkExperience) => {
    if (!apiKey) { toast.error('Add your Claude API key in Settings first'); return; }
    const targetId = exp.id;
    setLoadingId(targetId);
    try {
      const improved = await improveBullets(apiKey, exp.description, exp.title);
      if (editingId === targetId) {
        updateTemp('description', improved);
      } else {
        update(targetId, 'description', improved);
      }
      toast.success('Bullets improved!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="section-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {experience.map((exp, index) => {
          const isOpen = expandedId === exp.id;
          const analysis = analyzeDesc(exp.description);
          return (
            <div key={exp.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : exp.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.title || 'Job Title'} {exp.company ? `@ ${exp.company}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === exp.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(exp); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === experience.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(exp.id); }}><Trash2 size={12} /></button>
                </div>
              </div>

              {isOpen && (
                <div className="entry-body">
                  {editingId === exp.id ? (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Job Title *</label>
                          <input value={tempExp?.title} onChange={(e) => updateTemp('title', e.target.value)} placeholder="Software Engineer" />
                        </div>
                        <div className="form-group">
                          <label>Company *</label>
                          <input value={tempExp?.company} onChange={(e) => updateTemp('company', e.target.value)} placeholder="Acme Corp" />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Date</label>
                          <input value={tempExp?.startDate} onChange={(e) => updateTemp('startDate', e.target.value)} placeholder="Jan 2022" />
                        </div>
                        <div className="form-group">
                          <label>End Date</label>
                          <input value={tempExp?.endDate} onChange={(e) => updateTemp('endDate', e.target.value)} placeholder="Present" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label>Location</label>
                          <div className="input-with-icon">
                            <MapPin size={13} className="input-icon" />
                            <input value={tempExp?.location} onChange={(e) => updateTemp('location', e.target.value)} placeholder="San Francisco, CA" style={{ paddingLeft: 30 }} />
                          </div>
                        </div>
                        <label className="toggle-switch" style={{ flexShrink: 0, marginTop: 18 }} title="Remote">
                          <input type="checkbox" checked={tempExp?.remote} onChange={(e) => updateTemp('remote', e.target.checked)} />
                          <span className="toggle-track" />
                          <span className="toggle-thumb" />
                        </label>
                        <span style={{ fontSize: 11, color: tempExp?.remote ? 'var(--success)' : 'var(--text-muted)', marginTop: 18, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Wifi size={11} /> {tempExp?.remote ? 'Remote' : 'On-site'}
                        </span>
                      </div>

                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <label style={{ margin: 0 }}>Description</label>
                          <button
                            className="btn-ai btn btn-sm"
                            onClick={() => improveWithAI(exp)}
                            disabled={loadingId === exp.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            {loadingId === exp.id ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                            {loadingId === exp.id ? 'Improving...' : '✨ AI Enhance'}
                          </button>
                        </div>
                        <textarea
                          rows={6}
                          value={tempExp?.description}
                          onChange={(e) => updateTemp('description', e.target.value)}
                          placeholder="- Led a team of 5 engineers...\n- Built X using Y..."
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {exp.location || 'Not set'} {exp.remote && '(Remote)'}</span>
                        <span>{exp.startDate} – {exp.endDate || 'Present'}</span>
                      </div>
                      <div style={{ 
                        padding: '10px', 
                        background: 'var(--bg-app)', 
                        borderRadius: 8, 
                        fontSize: 13, 
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: exp.description ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontStyle: exp.description ? 'normal' : 'italic',
                        minHeight: 40
                      }}>
                        {exp.description || 'No description added yet.'}
                      </div>
                      {exp.description && (
                         <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                           <span className={`tag ${analysis.hasVerbs ? 'tag-success' : 'tag-warning'}`} style={{ fontSize: 10 }}>
                             {analysis.hasVerbs ? '✓ Strong action verbs' : '⚠ Add action verbs'}
                           </span>
                           <span className={`tag ${analysis.hasMetrics ? 'tag-success' : 'tag-warning'}`} style={{ fontSize: 10 }}>
                             {analysis.hasMetrics ? '✓ Metrics present' : '⚠ Add numbers/metrics'}
                           </span>
                         </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <Plus size={14} /> Add Experience
      </button>
    </div>
  );
}
