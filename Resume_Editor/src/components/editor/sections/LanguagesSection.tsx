import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useResumeStore } from '../../../store/useResumeStore';
import type { Language } from '../../../types/resume';
import toast from 'react-hot-toast';

const PROFICIENCY_LEVELS: Language['proficiency'][] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Native'];
const PROFICIENCY_LABELS: Record<string, string> = {
  A1: 'A1 – Beginner',
  A2: 'A2 – Elementary',
  B1: 'B1 – Intermediate',
  B2: 'B2 – Upper-Intermediate',
  C1: 'C1 – Advanced',
  C2: 'C2 – Proficient',
  Native: 'Native / Bilingual',
};
const LEVEL_COLORS: Record<string, string> = {
  A1: '#94a3b8', A2: '#94a3b8', B1: '#60a5fa', B2: '#3b82f6', C1: '#10b981', C2: '#059669', Native: '#8b5cf6',
};

export default function LanguagesSection() {
  const { getActiveResume, updateData } = useResumeStore();
  const resume = getActiveResume();
  const [langName, setLangName] = useState('');
  const [proficiency, setProficiency] = useState<Language['proficiency']>('B2');
  if (!resume) return null;
  const languages = resume.data.languages;

  const add = () => {
    if (!langName.trim()) return;
    if (languages.some((l) => l.language.toLowerCase() === langName.toLowerCase())) { toast.error('Language already added'); return; }
    updateData({ languages: [...languages, { id: crypto.randomUUID(), language: langName.trim(), proficiency }] });
    setLangName('');
    toast.success(`${langName} added`);
  };

  const remove = (id: string) => updateData({ languages: languages.filter((l) => l.id !== id) });

  const updateLevel = (id: string, level: Language['proficiency']) => {
    updateData({ languages: languages.map((l) => (l.id === id ? { ...l, proficiency: level } : l)) });
  };

  return (
    <div className="section-body">
      {/* Add Row */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Language</label>
          <input value={langName} onChange={(e) => setLangName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="e.g. Spanish" />
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Proficiency</label>
          <select value={proficiency} onChange={(e) => setProficiency(e.target.value as Language['proficiency'])}>
            {PROFICIENCY_LEVELS.map((l) => <option key={l} value={l}>{PROFICIENCY_LABELS[l]}</option>)}
          </select>
        </div>
        <button className="btn btn-primary btn-sm" onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 0, flexShrink: 0, height: 36 }}>
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Language Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {languages.map((lang) => (
          <div key={lang.id} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            background: `${LEVEL_COLORS[lang.proficiency]}15`, border: `1px solid ${LEVEL_COLORS[lang.proficiency]}40`,
            borderRadius: 9999, fontSize: 12,
          }}>
            <span style={{ fontWeight: 600, color: LEVEL_COLORS[lang.proficiency] }}>{lang.language}</span>
            <select
              value={lang.proficiency}
              onChange={(e) => updateLevel(lang.id, e.target.value as Language['proficiency'])}
              style={{
                background: 'none', border: 'none', fontSize: 11, color: LEVEL_COLORS[lang.proficiency],
                padding: '0 16px 0 0', cursor: 'pointer', fontFamily: 'inherit', width: 'auto',
              }}
            >
              {PROFICIENCY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <button onClick={() => remove(lang.id)} style={{ display: 'flex', lineHeight: 1, background: 'none', cursor: 'pointer', color: LEVEL_COLORS[lang.proficiency], opacity: 0.6 }}>
              <X size={11} />
            </button>
          </div>
        ))}
        {languages.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No languages added yet.</p>}
      </div>
    </div>
  );
}
