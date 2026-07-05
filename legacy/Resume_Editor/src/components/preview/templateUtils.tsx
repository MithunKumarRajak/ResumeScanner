import type { ResumeData, StyleConfig } from '../../types/resume';

export interface TemplateProps {
  data: ResumeData;
  style: StyleConfig;
  hiddenSections: string[];
}

// Shared utility for parsing bullet descriptions
export function renderBullets(text: string, color = '#374151'): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n').filter((l) => l.trim());
  const bullets = lines.filter((l) => l.trim().startsWith('- ') || l.trim().startsWith('• '));
  const nonBullets = lines.filter((l) => !l.trim().startsWith('- ') && !l.trim().startsWith('• '));

  if (bullets.length > 0) {
    return (
      <ul style={{ paddingLeft: 16, margin: 0 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ marginBottom: 2, lineHeight: 1.5 }}>{b.replace(/^[-•]\s*/, '')}</li>
        ))}
        {nonBullets.map((t, i) => (
          <p key={`nb-${i}`} style={{ margin: '2px 0' }}>{t}</p>
        ))}
      </ul>
    );
  }
  return <p style={{ margin: 0, lineHeight: 1.6 }}>{text}</p>;
}

export function getFontSize(scale: StyleConfig['fontSize']): Record<string, string> {
  const scales = {
    small: { name: '16px', title: '11px', section: '9px', body: '9px', contact: '9px' },
    medium: { name: '20px', title: '12px', section: '10px', body: '10px', contact: '10px' },
    large: { name: '24px', title: '14px', section: '11px', body: '11px', contact: '11px' },
  };
  return scales[scale] || scales.medium;
}

export function getSpacing(spacing: StyleConfig['spacing']): Record<string, string> {
  const spacings = {
    compact: { section: '8px', entry: '6px', item: '2px' },
    standard: { section: '14px', entry: '10px', item: '4px' },
    spacious: { section: '20px', entry: '16px', item: '8px' },
  };
  return spacings[spacing] || spacings.standard;
}
