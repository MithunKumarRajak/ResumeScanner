import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, Sparkles, RefreshCw, ExternalLink, X } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import { improveBullets } from '../../../lib/aiService';
import type { Project } from '../../../types/resume';
import toast from 'react-hot-toast';

export default function ProjectsSection() {
  const { getActiveResume, updateData, apiKey } = useResumeStore();
  const resume = getActiveResume();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempProj, setTempProj] = useState<Project | null>(null);
  const [techInput, setTechInput] = useState<string>('');
  if (!resume) return null;
  const projects = resume.data.projects;

  const handleEdit = (proj: Project) => {
    setTempProj({ ...proj });
    setEditingId(proj.id);
    setExpandedId(proj.id);
  };

  const handleSave = () => {
    if (!tempProj) return;
    updateData({
      projects: projects.map((p) => (p.id === editingId ? tempProj : p)),
    });
    setEditingId(null);
    setTempProj(null);
    toast.success('Project saved!');
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempProj(null);
  };

  const updateTemp = (field: keyof Project, value: string | string[]) => {
    if (!tempProj) return;
    setTempProj({ ...tempProj, [field]: value });
  };

  const update = (id: string, field: keyof Project, value: string | string[]) => {
    updateData({ projects: projects.map((p) => (p.id === id ? { ...p, [field]: value } : p)) });
  };

  const addTech = () => {
    if (!tempProj || !techInput.trim()) return;
    const val = techInput.trim();
    if (!tempProj.techStack.includes(val)) {
      updateTemp('techStack', [...tempProj.techStack, val]);
    }
    setTechInput('');
  };

  const removeTech = (tech: string) => {
    if (!tempProj) return;
    updateTemp('techStack', tempProj.techStack.filter((t) => t !== tech));
  };

  const add = () => {
    const id = crypto.randomUUID();
    updateData({ projects: [...projects, { id, title: '', techStack: [], liveUrl: '', githubUrl: '', description: '' }] });
    setExpandedId(id);
    toast.success('Project added');
  };

  const remove = (id: string) => {
    updateData({ projects: projects.filter((p) => p.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const move = (index: number, dir: 'up' | 'down') => {
    const arr = [...projects];
    const swap = dir === 'up' ? index - 1 : index + 1;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    updateData({ projects: arr });
  };

  const improveWithAI = async (proj: Project) => {
    if (!apiKey) { toast.error('Add your Claude API key in Settings first'); return; }
    const targetId = proj.id;
    setLoadingId(targetId);
    try {
      const improved = await improveBullets(apiKey, proj.description, proj.title + ' project');
      if (editingId === targetId) {
        updateTemp('description', improved);
      } else {
        update(targetId, 'description', improved);
      }
      toast.success('Description improved!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'AI error');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="section-body">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {projects.map((proj, index) => {
          const isOpen = expandedId === proj.id;
          return (
            <div key={proj.id} className="entry-card">
              <div className="entry-header" onClick={() => setExpandedId(isOpen ? null : proj.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <GripVertical size={14} color="var(--text-muted)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proj.title || 'Project Title'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  {editingId === proj.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>Cancel</button>
                      <button className="btn btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleSave(); }}>Save</button>
                    </div>
                  ) : (
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); handleEdit(proj); }}>Edit</button>
                  )}
                  <div style={{ height: 16, width: 1, background: 'var(--border)', margin: '0 4px' }} />
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'up'); }} disabled={index === 0}><ChevronUp size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={(e) => { e.stopPropagation(); move(index, 'down'); }} disabled={index === projects.length - 1}><ChevronDown size={14} /></button>
                  <button className="btn-icon" style={{ width: 24, height: 24, color: 'var(--danger)' }} onClick={(e) => { e.stopPropagation(); remove(proj.id); }}><Trash2 size={12} /></button>
                </div>
              </div>
              {isOpen && (
                <div className="entry-body">
                  {editingId === proj.id ? (
                    <>
                      <div className="form-group">
                        <label>Project Title</label>
                        <input value={tempProj?.title} onChange={(e) => updateTemp('title', e.target.value)} placeholder="My Awesome Project" />
                      </div>
                      <div className="form-group">
                        <label>Tech Stack</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            value={techInput}
                            onChange={(e) => setTechInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                            placeholder="React, TypeScript..."
                            style={{ flex: 1 }}
                          />
                          <button className="btn btn-secondary btn-sm" onClick={addTech}><Plus size={13} /></button>
                        </div>
                        {tempProj?.techStack.length ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                            {tempProj.techStack.map((t) => (
                              <span key={t} className="tag tag-accent" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12 }}>
                                {t}
                                <button onClick={() => removeTech(t)} style={{ display: 'flex', background: 'none', marginLeft: 4, cursor: 'pointer', opacity: 0.7 }}><X size={10} /></button>
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Live URL</label>
                          <div className="input-with-icon"><ExternalLink size={12} className="input-icon" />
                            <input value={tempProj?.liveUrl || ''} onChange={(e) => updateTemp('liveUrl', e.target.value)} placeholder="myproject.com" style={{ paddingLeft: 28 }} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>GitHub URL</label>
                          <div className="input-with-icon"><ExternalLink size={12} className="input-icon" />
                            <input value={tempProj?.githubUrl || ''} onChange={(e) => updateTemp('githubUrl', e.target.value)} placeholder="github.com/user/repo" style={{ paddingLeft: 28 }} />
                          </div>
                        </div>
                      </div>
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <label style={{ margin: 0 }}>Description</label>
                          <button className="btn-ai btn btn-sm" onClick={() => improveWithAI(proj)} disabled={loadingId === proj.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {loadingId === proj.id ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />} ✨ AI Enhance
                          </button>
                        </div>
                        <textarea rows={5} value={tempProj?.description} onChange={(e) => updateTemp('description', e.target.value)} placeholder="- Built a tool that...\n- Optimized performance by..." />
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {proj.techStack.map(t => <span key={t} style={{ fontSize: 11, background: 'var(--bg-app)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>{t}</span>)}
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        {proj.liveUrl && <a href={proj.liveUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> Live Demo</a>}
                        {proj.githubUrl && <a href={proj.githubUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}><ExternalLink size={12} /> GitHub</a>}
                      </div>
                      <div style={{ 
                        padding: '10px', 
                        background: 'var(--bg-app)', 
                        borderRadius: 8, 
                        fontSize: 13, 
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        color: proj.description ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontStyle: proj.description ? 'normal' : 'italic'
                      }}>
                        {proj.description || 'No description provided.'}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button className="btn btn-secondary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
        <Plus size={14} /> Add Project
      </button>
    </div>
  );
}
