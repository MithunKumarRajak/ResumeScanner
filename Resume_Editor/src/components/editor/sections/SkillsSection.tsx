import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import { searchSkills, getCategoryForSkill } from '../../../lib/skillLibrary';
import type { Skill } from '../../../types/resume';
import toast from 'react-hot-toast';

const CATEGORIES = ['Technical', 'Tools', 'Soft', 'Languages'] as const;
const CATEGORY_COLORS: Record<string, string> = {
  Technical: 'var(--accent)',
  Tools: '#10b981',
  Soft: '#f59e0b',
  Languages: '#ec4899',
};

export default function SkillsSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [tempSkills, setTempSkills] = useState<Skill[]>([]);

  if (!resume) return null;
  const skills = resume.data.skills;

  const handleEdit = () => {
    setTempSkills([...skills]);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateData({ skills: tempSkills });
    setIsEditing(false);
    toast.success('Skills updated!');
  };

  const handleCancel = () => {
    setTempSkills([...skills]);
    setIsEditing(false);
  };

  const handleInput = (val: string) => {
    setInput(val);
    setSuggestions(val.length >= 1 ? searchSkills(val) : []);
  };

  const addSkill = (name: string) => {
    if (!name.trim()) return;
    const currentSkills = isEditing ? tempSkills : skills;
    if (currentSkills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    const cat = getCategoryForSkill(name);
    const newSkill: Skill = { id: crypto.randomUUID(), name: name.trim(), category: cat as Skill['category'] };
    
    if (isEditing) {
      setTempSkills([...tempSkills, newSkill]);
    } else {
      updateData({ skills: [...skills, newSkill] });
    }
    
    setInput('');
    setSuggestions([]);
  };

  const removeSkill = (id: string) => {
    if (isEditing) {
      setTempSkills(tempSkills.filter((s) => s.id !== id));
    } else {
      updateData({ skills: skills.filter((s) => s.id !== id) });
    }
  };

  const displaySkills = isEditing ? tempSkills : skills;
  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = displaySkills.filter((s) => s.category === cat);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="section-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Skills & Expertise</h4>
        {!isEditing ? (
          <button className="btn btn-secondary btn-sm" onClick={handleEdit}>Edit Skills</button>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleCancel}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
          </div>
        )}
      </div>

      {isEditing && (
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) { e.preventDefault(); addSkill(input); } }}
              placeholder="Type a skill and press Enter..."
              style={{ flex: 1 }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={() => addSkill(input)} disabled={!input.trim()} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={13} /> Add
            </button>
          </div>
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50, marginTop: 4, overflow: 'hidden',
            }}>
              {suggestions.map((s) => (
                <div key={s} onClick={() => addSkill(s)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, transition: 'background 0.1s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-app)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skills by Category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CATEGORIES.map((cat) => {
          const catSkills = grouped[cat];
          if (!catSkills || catSkills.length === 0) return null;
          return (
            <div key={cat}>
              <div style={{ fontSize: 11, fontWeight: 600, color: CATEGORY_COLORS[cat], textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                {cat}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {catSkills.map((skill) => (
                  <div key={skill.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                    background: `${CATEGORY_COLORS[cat]}12`, border: `1px solid ${CATEGORY_COLORS[cat]}30`,
                    borderRadius: 8, fontSize: 13, color: CATEGORY_COLORS[cat], fontWeight: 500,
                  }}>
                    {skill.name}
                    {isEditing && (
                      <button onClick={() => removeSkill(skill.id)} style={{ display: 'flex', lineHeight: 1, background: 'none', cursor: 'pointer', color: CATEGORY_COLORS[cat], opacity: 0.7, padding: 0 }}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {skills.length === 0 && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 13 }}>
          No skills yet — type above to add from 500+ suggestions
        </div>
      )}
    </div>
  );
}
