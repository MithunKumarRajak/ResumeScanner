import { useResumeStore } from '../../store/useResumeStore';
import type { TemplateId } from '../../types/resume';

const TEMPLATES: { id: TemplateId; label: string; emoji: string; desc: string }[] = [
  { id: 'modern', label: 'Modern', emoji: '⚡', desc: 'Bold accents, clean layout' },
  { id: 'classic', label: 'Classic', emoji: '📄', desc: 'Traditional, timeless' },
  { id: 'minimal', label: 'Minimal', emoji: '🌿', desc: 'White space, subtle' },
  { id: 'creative', label: 'Creative', emoji: '🎨', desc: 'Colorful, standout' },
  { id: 'executive', label: 'Executive', emoji: '👔', desc: 'Senior, authoritative' },
  { id: 'tech', label: 'Tech', emoji: '💻', desc: 'Developer-focused' },
  { id: 'academic', label: 'Academic', emoji: '🎓', desc: 'Research, academia' },
  { id: 'two-column', label: 'Two-Col', emoji: '⬜', desc: 'Sidebar layout' },
  { id: 'infographic', label: 'Infographic', emoji: '📊', desc: 'Visual, graphic' },
  { id: 'ats-safe', label: 'ATS-Safe', emoji: '🤖', desc: 'Maximum compatibility' },
];

const FONTS = ['Inter', 'Roboto', 'Merriweather', 'Playfair Display', 'Lato', 'Fira Code', 'Source Serif 4'];
const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#64748b', '#1e293b'];

export default function StylePanel() {
  const { getActiveResume, updateStyle } = useResumeStore();
  const resume = getActiveResume();
  if (!resume) return null;
  const style = resume.style;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Template Picker */}
      <div>
        <label style={{ display: 'block', marginBottom: 10, fontSize: 12 }}>Template</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => updateStyle({ template: tpl.id })}
              style={{
                padding: '10px 12px', borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
                border: `2px solid ${style.template === tpl.id ? 'var(--accent)' : 'var(--border)'}`,
                background: style.template === tpl.id ? 'var(--accent-light)' : 'var(--bg-card)',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 4 }}>{tpl.emoji}</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: style.template === tpl.id ? 'var(--accent)' : 'var(--text-primary)' }}>{tpl.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{tpl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <label style={{ display: 'block', marginBottom: 10 }}>Accent Color</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => updateStyle({ accentColor: c })}
              style={{
                width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                boxShadow: style.accentColor === c ? `0 0 0 3px ${c}50, 0 0 0 5px white` : 'none',
                transform: style.accentColor === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.15s',
              }}
              title={c}
            />
          ))}
          <input
            type="color" value={style.accentColor}
            onChange={(e) => updateStyle({ accentColor: e.target.value })}
            style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: '50%', cursor: 'pointer', overflow: 'hidden' }}
            title="Custom color"
          />
        </div>
      </div>

      {/* Fonts */}
      <div>
        <label style={{ display: 'block', marginBottom: 10 }}>Font</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {FONTS.map((font) => (
            <button
              key={font}
              onClick={() => updateStyle({ headingFont: font, bodyFont: font })}
              style={{
                padding: '8px 10px', borderRadius: 8, fontSize: 13, fontFamily: font, cursor: 'pointer',
                border: `1.5px solid ${style.headingFont === font ? 'var(--accent)' : 'var(--border)'}`,
                background: style.headingFont === font ? 'var(--accent-light)' : 'var(--bg-card)',
                color: style.headingFont === font ? 'var(--accent)' : 'var(--text-primary)',
                transition: 'all 0.15s', textAlign: 'left',
              }}
            >
              {font.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div>
        <label style={{ display: 'block', marginBottom: 10 }}>Font Scale</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['small', 'medium', 'large'] as const).map((size) => (
            <button key={size} onClick={() => updateStyle({ fontSize: size })} style={{
              flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
              border: `1.5px solid ${style.fontSize === size ? 'var(--accent)' : 'var(--border)'}`,
              background: style.fontSize === size ? 'var(--accent-light)' : 'var(--bg-card)',
              color: style.fontSize === size ? 'var(--accent)' : 'var(--text-primary)',
              fontWeight: style.fontSize === size ? 600 : 400, transition: 'all 0.15s',
            }}>
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Spacing */}
      <div>
        <label style={{ display: 'block', marginBottom: 10 }}>Spacing Density</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['compact', 'standard', 'spacious'] as const).map((sp) => (
            <button key={sp} onClick={() => updateStyle({ spacing: sp })} style={{
              flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
              border: `1.5px solid ${style.spacing === sp ? 'var(--accent)' : 'var(--border)'}`,
              background: style.spacing === sp ? 'var(--accent-light)' : 'var(--bg-card)',
              color: style.spacing === sp ? 'var(--accent)' : 'var(--text-primary)',
              fontWeight: style.spacing === sp ? 600 : 400, transition: 'all 0.15s',
            }}>
              {sp}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
