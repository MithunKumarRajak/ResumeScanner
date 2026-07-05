import type { TemplateProps } from '../templateUtils';
import { getFontSize, getSpacing, renderBullets } from '../templateUtils';

export default function ClassicTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications, awards, volunteer, publications, languages, references, referencesOnRequest } = data;
  const accent = style.accentColor;
  const font = style.headingFont || 'Merriweather, Georgia, serif';
  const isHidden = (s: string) => hiddenSections.includes(s);

  const HR = () => <hr style={{ border: 'none', borderTop: `1.5px solid ${accent}`, margin: `${sp.entry} 0` }} />;

  return (
    <div style={{ fontFamily: `'${font}', Georgia, serif`, color: '#1a1a1a', padding: '20mm', lineHeight: 1.5, background: 'white', minHeight: '297mm' }}>
      {/* Header — centered */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <h1 style={{ fontSize: fs.name, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#0f172a', margin: 0 }}>{p.fullName}</h1>
        <div style={{ fontSize: fs.title, color: accent, marginTop: 4, letterSpacing: 1 }}>{p.title}</div>
        <div style={{ fontSize: fs.contact, color: '#555', marginTop: 8, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 12px' }}>
          {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join('  |  ')}
        </div>
      </div>
      <HR />

      {!isHidden('summary') && summary && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 6px` }}>Summary</h2>
          <p style={{ fontSize: fs.body, lineHeight: 1.7, margin: `0 0 ${sp.section}` }}>{summary}</p>
          <HR />
        </>
      )}

      {!isHidden('experience') && experience.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 ${sp.entry}` }}>Experience</h2>
          {experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: sp.entry }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}, {exp.company}</span>
                <span style={{ fontSize: fs.contact, color: '#555' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
              </div>
              {exp.location && <div style={{ fontSize: fs.contact, color: '#666', marginBottom: 4 }}>{exp.location}{exp.remote ? ' (Remote)' : ''}</div>}
              <div style={{ fontSize: fs.body }}>{renderBullets(exp.description)}</div>
            </div>
          ))}
          <HR />
        </>
      )}

      {!isHidden('education') && education.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 ${sp.entry}` }}>Education</h2>
          {education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: sp.item }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: fs.body }}>{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</span>
                <span style={{ fontSize: fs.contact, color: '#555' }}>{edu.graduationYear}</span>
              </div>
              <div style={{ color: accent, fontSize: fs.contact }}>{edu.institution}</div>
              {(edu.gpa || edu.honors) && <div style={{ fontSize: fs.contact, color: '#666' }}>{[edu.gpa && `GPA: ${edu.gpa}`, edu.honors].filter(Boolean).join(' · ')}</div>}
            </div>
          ))}
          <HR />
        </>
      )}

      {!isHidden('skills') && skills.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 6px` }}>Skills</h2>
          <p style={{ fontSize: fs.body, margin: `0 0 ${sp.section}` }}>{skills.map((s) => s.name).join('  ·  ')}</p>
          <HR />
        </>
      )}

      {!isHidden('projects') && projects.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 ${sp.entry}` }}>Projects</h2>
          {projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: sp.entry }}>
              <div style={{ fontWeight: 700, fontSize: fs.body }}>{proj.title}{proj.techStack.length > 0 ? ` (${proj.techStack.join(', ')})` : ''}</div>
              <div style={{ fontSize: fs.body }}>{renderBullets(proj.description)}</div>
            </div>
          ))}
          <HR />
        </>
      )}

      {!isHidden('certifications') && certifications.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 6px` }}>Certifications</h2>
          {certifications.map((c) => (
            <div key={c.id} style={{ fontSize: fs.body, marginBottom: sp.item }}>
              <strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ''}{c.date ? ` (${c.date})` : ''}
            </div>
          ))}
          <HR />
        </>
      )}

      {!isHidden('languages') && languages.length > 0 && (
        <>
          <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, margin: `0 0 6px` }}>Languages</h2>
          <p style={{ fontSize: fs.body, margin: `0 0 ${sp.section}` }}>{languages.map((l) => `${l.language} (${l.proficiency})`).join('  ·  ')}</p>
        </>
      )}

      {!isHidden('references') && referencesOnRequest && (
        <p style={{ fontSize: fs.body, color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 14 }}>References available upon request.</p>
      )}
    </div>
  );
}
