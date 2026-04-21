import type { TemplateProps } from '../templateUtils';
import { getFontSize, getSpacing, renderBullets } from '../templateUtils';

export default function TwoColumnTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications, awards, languages, references, referencesOnRequest } = data;
  const accent = style.accentColor;
  const font = style.headingFont || 'Inter';
  const isHidden = (s: string) => hiddenSections.includes(s);

  const SideSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: sp.section }}>
      <h3 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1, color: 'white', fontFamily: font, margin: `0 0 6px`, fontWeight: 700 }}>{title}</h3>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.3)', marginBottom: 8 }} />
      {children}
    </div>
  );

  const MainSection = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: `${sp.section} 0 ${sp.entry}` }}>
      <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, fontFamily: font, margin: 0, fontWeight: 700 }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: `${accent}40` }} />
    </div>
  );

  return (
    <div style={{ fontFamily: font, color: '#1a1a1a', display: 'flex', minHeight: '297mm', background: 'white' }}>
      {/* Left Sidebar */}
      <div style={{ width: '35%', background: accent, padding: '20mm 16mm', color: 'white', flexShrink: 0 }}>
        {p.profilePicture && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img src={p.profilePicture} alt="Profile" style={{ width: 90, height: 90, borderRadius: p.photoShape === 'square' ? 8 : p.photoShape === 'rounded' ? 20 : '50%', objectFit: 'cover', border: '3px solid white' }} />
          </div>
        )}
        <h1 style={{ fontSize: fs.title, fontWeight: 800, color: 'white', fontFamily: font, margin: '0 0 4px', textAlign: 'center', lineHeight: 1.2 }}>{p.fullName}</h1>
        <div style={{ fontSize: fs.contact, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 20, fontWeight: 500 }}>{p.title}</div>

        <SideSection title="Contact">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: fs.contact, color: 'rgba(255,255,255,0.9)' }}>
            {p.email && <span>{p.email}</span>}
            {p.phone && <span>{p.phone}</span>}
            {p.location && <span>{p.location}</span>}
            {p.linkedin && <span>{p.linkedin}</span>}
            {p.github && <span>{p.github}</span>}
            {p.portfolio && <span>{p.portfolio}</span>}
          </div>
        </SideSection>

        {!isHidden('skills') && skills.length > 0 && (
          <SideSection title="Skills">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {skills.map((s) => (
                <div key={s.id} style={{ fontSize: fs.contact, color: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>{s.name}</span></div>
                </div>
              ))}
            </div>
          </SideSection>
        )}

        {!isHidden('languages') && languages.length > 0 && (
          <SideSection title="Languages">
            {languages.map((l) => (
              <div key={l.id} style={{ fontSize: fs.contact, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
                {l.language} <span style={{ opacity: 0.7 }}>({l.proficiency})</span>
              </div>
            ))}
          </SideSection>
        )}

        {!isHidden('certifications') && certifications.length > 0 && (
          <SideSection title="Certifications">
            {certifications.map((c) => (
              <div key={c.id} style={{ fontSize: fs.contact, color: 'rgba(255,255,255,0.9)', marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ opacity: 0.75 }}>{c.issuer} · {c.date}</div>
              </div>
            ))}
          </SideSection>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '20mm 16mm' }}>
        {!isHidden('summary') && summary && (
          <>
            <MainSection title="Profile" />
            <p style={{ fontSize: fs.body, lineHeight: 1.7, color: '#374151', margin: 0 }}>{summary}</p>
          </>
        )}

        {!isHidden('experience') && experience.length > 0 && (
          <>
            <MainSection title="Experience" />
            {experience.map((exp) => (
              <div key={exp.id} style={{ marginBottom: sp.entry }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</span>
                  <span style={{ fontSize: fs.contact, color: '#64748b' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
                </div>
                <div style={{ fontSize: fs.contact, color: accent, fontWeight: 600, marginBottom: 4 }}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</div>
                <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(exp.description)}</div>
              </div>
            ))}
          </>
        )}

        {!isHidden('education') && education.length > 0 && (
          <>
            <MainSection title="Education" />
            {education.map((edu) => (
              <div key={edu.id} style={{ marginBottom: sp.entry }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: fs.body }}>{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</span>
                  <span style={{ fontSize: fs.contact, color: '#64748b' }}>{edu.graduationYear}</span>
                </div>
                <div style={{ color: accent, fontSize: fs.contact, fontWeight: 600 }}>{edu.institution}</div>
                {(edu.gpa || edu.honors) && <div style={{ fontSize: fs.contact, color: '#64748b' }}>{[edu.gpa && `GPA: ${edu.gpa}`, edu.honors].filter(Boolean).join(' · ')}</div>}
              </div>
            ))}
          </>
        )}

        {!isHidden('projects') && projects.length > 0 && (
          <>
            <MainSection title="Projects" />
            {projects.map((proj) => (
              <div key={proj.id} style={{ marginBottom: sp.entry }}>
                <div style={{ fontWeight: 700, fontSize: fs.body }}>{proj.title}</div>
                {proj.techStack.length > 0 && <div style={{ fontSize: fs.contact, color: accent, marginBottom: 3 }}>{proj.techStack.join(' · ')}</div>}
                <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(proj.description)}</div>
              </div>
            ))}
          </>
        )}

        {!isHidden('awards') && awards.length > 0 && (
          <>
            <MainSection title="Awards" />
            {awards.map((a) => (
              <div key={a.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
                <strong>{a.title}</strong>{a.issuer ? ` — ${a.issuer}` : ''}{a.date ? ` (${a.date})` : ''}
              </div>
            ))}
          </>
        )}

        {!isHidden('references') && referencesOnRequest && (
          <p style={{ fontSize: fs.body, color: '#64748b', fontStyle: 'italic', marginTop: 20 }}>References available upon request.</p>
        )}
      </div>
    </div>
  );
}
