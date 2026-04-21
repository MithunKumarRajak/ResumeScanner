// Minimal Template
import type { TemplateProps } from '../templateUtils';
import { getFontSize, getSpacing, renderBullets } from '../templateUtils';

export function MinimalTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications, languages, references, referencesOnRequest } = data;
  const accent = style.accentColor;
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#1a1a1a', padding: '24mm 22mm', lineHeight: 1.6, background: 'white', minHeight: '297mm' }}>
      <h1 style={{ fontSize: fs.name, fontWeight: 300, letterSpacing: -1, color: '#0f172a', margin: '0 0 2px' }}>{p.fullName}</h1>
      <div style={{ fontSize: fs.title, color: '#64748b', marginBottom: 12 }}>{p.title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: fs.contact, color: '#94a3b8', marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
        {[p.email, p.phone, p.location, p.linkedin, p.github, p.portfolio].filter(Boolean).join('  ·  ')}
      </div>

      {!isHidden('summary') && summary && <p style={{ fontSize: fs.body, color: '#475569', lineHeight: 1.8, margin: `0 0 ${sp.section}` }}>{summary}</p>}

      {(!isHidden('experience') && experience.length > 0) && experience.map((exp) => (
        <div key={exp.id} style={{ marginBottom: sp.entry, borderLeft: `2px solid ${accent}20`, paddingLeft: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: fs.body }}>{exp.title} · <span style={{ color: accent }}>{exp.company}</span></span>
            <span style={{ fontSize: fs.contact, color: '#94a3b8' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
          </div>
          <div style={{ fontSize: fs.body, color: '#475569', marginTop: 4 }}>{renderBullets(exp.description)}</div>
        </div>
      ))}

      {(!isHidden('education') && education.length > 0) && education.map((edu) => (
        <div key={edu.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
          <span style={{ fontWeight: 600 }}>{edu.degree}</span> · {edu.institution} <span style={{ color: '#94a3b8' }}>({edu.graduationYear})</span>
        </div>
      ))}

      {!isHidden('skills') && skills.length > 0 && (
        <p style={{ fontSize: fs.body, color: '#475569', margin: `${sp.section} 0` }}>{skills.map(s => s.name).join(' · ')}</p>
      )}

      {(!isHidden('projects') && projects.length > 0) && projects.map((proj) => (
        <div key={proj.id} style={{ marginBottom: sp.entry }}>
          <span style={{ fontWeight: 600, fontSize: fs.body }}>{proj.title}</span>
          {proj.techStack.length > 0 && <span style={{ color: '#94a3b8', fontSize: fs.contact }}> · {proj.techStack.join(', ')}</span>}
          <div style={{ fontSize: fs.body, color: '#475569' }}>{renderBullets(proj.description)}</div>
        </div>
      ))}

      {!isHidden('languages') && languages.length > 0 && (
        <p style={{ fontSize: fs.body, color: '#64748b' }}>{languages.map(l => `${l.language} (${l.proficiency})`).join(' · ')}</p>
      )}
    </div>
  );
}

// Executive Template
export function ExecutiveTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, certifications, awards, references, referencesOnRequest } = data;
  const accent = '#0f172a';
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: "'Lato', sans-serif", color: '#1a1a1a', background: 'white', minHeight: '297mm' }}>
      <div style={{ background: accent, padding: '14mm 20mm', color: 'white' }}>
        <h1 style={{ fontSize: fs.name, fontWeight: 700, color: 'white', margin: '0 0 4px', letterSpacing: 1 }}>{p.fullName}</h1>
        <div style={{ fontSize: fs.title, color: style.accentColor, fontWeight: 600, marginBottom: 10 }}>{p.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: fs.contact, color: 'rgba(255,255,255,0.75)' }}>
          {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join('  |  ')}
        </div>
      </div>
      <div style={{ padding: '14mm 20mm' }}>
        {!isHidden('summary') && summary && <><p style={{ fontSize: fs.body, lineHeight: 1.7, borderLeft: `3px solid ${style.accentColor}`, paddingLeft: 12, margin: `0 0 ${sp.section}`, color: '#374151' }}>{summary}</p></>}
        {!isHidden('experience') && experience.length > 0 && (
          <>
            <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, margin: `0 0 ${sp.entry}` }}>Professional Experience</h2>
            {experience.map((exp) => (
              <div key={exp.id} style={{ marginBottom: sp.entry }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</span>
                  <span style={{ fontSize: fs.contact, color: '#64748b' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
                </div>
                <div style={{ color: style.accentColor, fontWeight: 600, fontSize: fs.contact, marginBottom: 4 }}>{exp.company}</div>
                <div style={{ fontSize: fs.body }}>{renderBullets(exp.description)}</div>
              </div>
            ))}
          </>
        )}
        {!isHidden('education') && education.length > 0 && (
          <>
            <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, margin: `${sp.section} 0 ${sp.entry}` }}>Education</h2>
            {education.map((edu) => (
              <div key={edu.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
                <strong>{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</strong> · {edu.institution} · {edu.graduationYear}
                {edu.honors && <span style={{ color: '#64748b' }}> · {edu.honors}</span>}
              </div>
            ))}
          </>
        )}
        {!isHidden('skills') && skills.length > 0 && (
          <>
            <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 2, color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 4, margin: `${sp.section} 0 ${sp.entry}` }}>Core Competencies</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((s) => (
                <span key={s.id} style={{ padding: '3px 10px', background: '#f1f5f9', borderRadius: 4, fontSize: fs.contact, border: `1px solid #e2e8f0` }}>{s.name}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Tech Template
export function TechTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications } = data;
  const accent = style.accentColor;
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: "'Fira Code', monospace", color: '#e2e8f0', background: '#0f172a', minHeight: '297mm', padding: '20mm' }}>
      <div style={{ borderBottom: `1px solid ${accent}`, paddingBottom: 16, marginBottom: 16 }}>
        <span style={{ color: accent, fontSize: 12 }}>// resume.json</span>
        <h1 style={{ fontSize: fs.name, fontWeight: 700, color: 'white', margin: '8px 0 4px' }}>{p.fullName}</h1>
        <div style={{ color: accent, fontSize: fs.title }}>&lt;{p.title} /&gt;</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: fs.contact, color: '#64748b', marginTop: 8 }}>
          {[p.email, p.github, p.linkedin, p.portfolio, p.location].filter(Boolean).map((item, i) => (
            <span key={i}>{item}</span>
          ))}
        </div>
      </div>

      {!isHidden('summary') && summary && (
        <div style={{ marginBottom: sp.section }}>
          <span style={{ color: accent, fontSize: 11 }}>/* {p.title} */</span>
          <p style={{ fontSize: fs.body, color: '#94a3b8', lineHeight: 1.7, margin: '4px 0' }}>{summary}</p>
        </div>
      )}

      {!isHidden('skills') && skills.length > 0 && (
        <div style={{ marginBottom: sp.section }}>
          <div style={{ color: accent, fontSize: 11, marginBottom: 8 }}>const skills = {'{'}</div>
          {['Technical', 'Tools'].map((cat) => {
            const catSkills = skills.filter((s) => s.category === cat);
            if (!catSkills.length) return null;
            return (
              <div key={cat} style={{ paddingLeft: 16, marginBottom: 4 }}>
                <span style={{ color: '#e2e8f0', fontSize: fs.contact }}>"{cat}": </span>
                <span style={{ color: '#34d399', fontSize: fs.contact }}>[{catSkills.map((s) => `"${s.name}"`).join(', ')}]</span>,
              </div>
            );
          })}
          <div style={{ color: accent, fontSize: 11 }}>{'}'}</div>
        </div>
      )}

      {!isHidden('experience') && experience.length > 0 && experience.map((exp) => (
        <div key={exp.id} style={{ marginBottom: sp.entry, paddingLeft: 0 }}>
          <div style={{ color: accent, fontSize: 11 }}>// {exp.startDate} - {exp.endDate || 'present'}</div>
          <div style={{ fontWeight: 700, fontSize: fs.body, color: 'white' }}>{exp.title} @ {exp.company}</div>
          {exp.location && <div style={{ color: '#64748b', fontSize: fs.contact }}>📍 {exp.location}{exp.remote ? ' (remote)' : ''}</div>}
          <div style={{ fontSize: fs.body, color: '#94a3b8', marginTop: 6 }}>{renderBullets(exp.description)}</div>
        </div>
      ))}

      {!isHidden('projects') && projects.length > 0 && projects.map((proj) => (
        <div key={proj.id} style={{ marginBottom: sp.entry, borderLeft: `2px solid ${accent}`, paddingLeft: 12 }}>
          <div style={{ fontWeight: 700, fontSize: fs.body, color: 'white' }}>{proj.title}</div>
          {proj.techStack.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', margin: '4px 0' }}>
              {proj.techStack.map((t) => <span key={t} style={{ background: `${accent}25`, border: `1px solid ${accent}50`, borderRadius: 4, padding: '1px 6px', fontSize: 10, color: accent }}>{t}</span>)}
            </div>
          )}
          <div style={{ fontSize: fs.body, color: '#94a3b8' }}>{renderBullets(proj.description)}</div>
        </div>
      ))}

      {!isHidden('education') && education.length > 0 && education.map((edu) => (
        <div key={edu.id} style={{ marginBottom: sp.item, fontSize: fs.body, color: '#94a3b8' }}>
          <strong style={{ color: '#e2e8f0' }}>{edu.degree}</strong> · {edu.institution} · {edu.graduationYear}
        </div>
      ))}
    </div>
  );
}

// ATS-Safe Template
export function ATSSafeTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications, awards, languages, references, referencesOnRequest } = data;
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', padding: '12mm 16mm', background: 'white', minHeight: '297mm' }}>
      <div style={{ textAlign: 'center', marginBottom: 12, borderBottom: '1px solid #000', paddingBottom: 8 }}>
        <div style={{ fontSize: fs.name, fontWeight: 700 }}>{p.fullName}</div>
        <div style={{ fontSize: fs.title }}>{p.title}</div>
        <div style={{ fontSize: fs.contact, marginTop: 4 }}>{[p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).join(' | ')}</div>
      </div>

      {!isHidden('summary') && summary && (
        <><h2 style={{ fontSize: fs.section, textTransform: 'uppercase', borderBottom: '1px solid #000', margin: `0 0 6px` }}>Summary</h2>
          <p style={{ fontSize: fs.body, margin: `0 0 ${sp.section}` }}>{summary}</p></>
      )}
      {!isHidden('experience') && experience.length > 0 && (
        <><h2 style={{ fontSize: fs.section, textTransform: 'uppercase', borderBottom: '1px solid #000', margin: `0 0 6px` }}>Work Experience</h2>
          {experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: sp.entry }}>
              <div style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</div>
              <div style={{ fontSize: fs.contact }}>{exp.company}{exp.location ? `, ${exp.location}` : ''} | {exp.startDate} - {exp.endDate || 'Present'}</div>
              <div style={{ fontSize: fs.body }}>{renderBullets(exp.description)}</div>
            </div>
          ))}</>
      )}
      {!isHidden('education') && education.length > 0 && (
        <><h2 style={{ fontSize: fs.section, textTransform: 'uppercase', borderBottom: '1px solid #000', margin: `${sp.section} 0 6px` }}>Education</h2>
          {education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
              <strong>{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</strong> | {edu.institution} | {edu.graduationYear}
              {edu.gpa && ` | GPA: ${edu.gpa}`}
            </div>
          ))}</>
      )}
      {!isHidden('skills') && skills.length > 0 && (
        <><h2 style={{ fontSize: fs.section, textTransform: 'uppercase', borderBottom: '1px solid #000', margin: `${sp.section} 0 6px` }}>Skills</h2>
          <p style={{ fontSize: fs.body, margin: `0 0 ${sp.section}` }}>{skills.map(s => s.name).join(', ')}</p></>
      )}
      {!isHidden('certifications') && certifications.length > 0 && (
        <><h2 style={{ fontSize: fs.section, textTransform: 'uppercase', borderBottom: '1px solid #000', margin: `${sp.section} 0 6px` }}>Certifications</h2>
          {certifications.map((c) => <div key={c.id} style={{ fontSize: fs.body, marginBottom: sp.item }}>{c.name} | {c.issuer} | {c.date}</div>)}</>
      )}
    </div>
  );
}

// Creative Template
export function CreativeTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects } = data;
  const accent = style.accentColor;
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1a1a1a', background: 'white', minHeight: '297mm' }}>
      {/* Creative banner header */}
      <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`, padding: '14mm 20mm', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -40, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', position: 'relative' }}>
          {p.profilePicture && <img src={p.profilePicture} alt="Profile" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', border: '3px solid white', flexShrink: 0 }} />}
          <div>
            <h1 style={{ fontSize: fs.name, fontWeight: 800, color: 'white', margin: '0 0 4px' }}>{p.fullName}</h1>
            <div style={{ fontSize: fs.title, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{p.title}</div>
            <div style={{ fontSize: fs.contact, color: 'rgba(255,255,255,0.7)', marginTop: 8 }}>{[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14mm 20mm' }}>
        {!isHidden('summary') && summary && <p style={{ fontSize: fs.body, lineHeight: 1.8, color: '#374151', margin: `0 0 ${sp.section}`, padding: '12px 14px', background: `${accent}08`, borderRadius: 8, borderLeft: `3px solid ${accent}` }}>{summary}</p>}

        {!isHidden('experience') && experience.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `0 0 ${sp.entry}` }}>
              <span style={{ fontWeight: 800, fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1, color: accent }}>Experience</span>
              <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, ${accent}60, transparent)` }} />
            </div>
            {experience.map((exp) => (
              <div key={exp.id} style={{ marginBottom: sp.entry, display: 'flex', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</span>
                    <span style={{ fontSize: fs.contact, color: '#64748b' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
                  </div>
                  <div style={{ color: accent, fontWeight: 600, fontSize: fs.contact, marginBottom: 4 }}>{exp.company}</div>
                  <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(exp.description)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {!isHidden('skills') && skills.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${sp.section} 0 ${sp.entry}` }}>
              <span style={{ fontWeight: 800, fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1, color: accent }}>Skills</span>
              <div style={{ flex: 1, height: 2, background: `linear-gradient(to right, ${accent}60, transparent)` }} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.map((s) => (
                <span key={s.id} style={{ padding: '4px 12px', background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 9999, fontSize: fs.contact, color: accent, fontWeight: 600 }}>{s.name}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Academic Template
export function AcademicTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, publications, certifications } = data;
  const accent = style.accentColor;
  const isHidden = (s: string) => hiddenSections.includes(s);

  return (
    <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: '#1a1a1a', padding: '20mm', background: 'white', minHeight: '297mm' }}>
      <h1 style={{ fontSize: fs.name, fontWeight: 700, color: '#0f172a', margin: '0 0 4px', borderBottom: `2px solid ${accent}`, paddingBottom: 8 }}>{p.fullName}</h1>
      <div style={{ fontSize: fs.title, color: accent, fontStyle: 'italic', marginBottom: 10 }}>{p.title}</div>
      <div style={{ fontSize: fs.contact, color: '#475569', marginBottom: 20 }}>{[p.email, p.location, p.linkedin, p.portfolio].filter(Boolean).join(' · ')}</div>

      {!isHidden('summary') && summary && <><h2 style={{ fontSize: fs.section, color: accent, margin: `0 0 6px`, textTransform: 'uppercase', letterSpacing: 1 }}>Research Statement</h2><p style={{ fontSize: fs.body, lineHeight: 1.8, marginBottom: sp.section }}>{summary}</p></>}
      {!isHidden('publications') && data.publications.length > 0 && (
        <><h2 style={{ fontSize: fs.section, color: accent, margin: `0 0 ${sp.entry}`, textTransform: 'uppercase', letterSpacing: 1 }}>Publications</h2>
          {data.publications.map((pub, i) => (
            <div key={pub.id} style={{ marginBottom: sp.item, fontSize: fs.body, display: 'flex', gap: 8 }}>
              <span style={{ color: accent, fontWeight: 700, flexShrink: 0 }}>[{i + 1}]</span>
              <span><em>"{pub.title}"</em> — {pub.journal}{pub.date ? `, ${pub.date}` : ''}{pub.doiUrl ? `. doi:${pub.doiUrl}` : ''}</span>
            </div>
          ))}</>
      )}
      {!isHidden('education') && education.length > 0 && (
        <><h2 style={{ fontSize: fs.section, color: accent, margin: `${sp.section} 0 ${sp.entry}`, textTransform: 'uppercase', letterSpacing: 1 }}>Education</h2>
          {education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: sp.entry }}>
              <div style={{ fontWeight: 700, fontSize: fs.body }}>{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</div>
              <div style={{ color: accent, fontSize: fs.contact }}>{edu.institution}, {edu.graduationYear}</div>
              {edu.honors && <div style={{ fontSize: fs.contact, fontStyle: 'italic', color: '#64748b' }}>{edu.honors}</div>}
            </div>
          ))}</>
      )}
      {!isHidden('experience') && experience.length > 0 && (
        <><h2 style={{ fontSize: fs.section, color: accent, margin: `${sp.section} 0 ${sp.entry}`, textTransform: 'uppercase', letterSpacing: 1 }}>Academic & Professional Experience</h2>
          {experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: sp.entry }}>
              <div style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</div>
              <div style={{ color: accent, fontSize: fs.contact, fontStyle: 'italic' }}>{exp.company}, {exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</div>
              <div style={{ fontSize: fs.body }}>{renderBullets(exp.description)}</div>
            </div>
          ))}</>
      )}
      {!isHidden('skills') && skills.length > 0 && (
        <><h2 style={{ fontSize: fs.section, color: accent, margin: `${sp.section} 0 ${sp.entry}`, textTransform: 'uppercase', letterSpacing: 1 }}>Technical Skills</h2>
          <p style={{ fontSize: fs.body, margin: `0 0 ${sp.section}` }}>{skills.map(s => s.name).join(', ')}</p></>
      )}
    </div>
  );
}

// Infographic Template
export function InfographicTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, languages } = data;
  const accent = style.accentColor;
  const isHidden = (s: string) => hiddenSections.includes(s);

  const proficiencyWidth: Record<string, number> = { A1: 15, A2: 30, B1: 45, B2: 60, C1: 75, C2: 90, Native: 100 };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', color: '#1a1a1a', background: 'white', minHeight: '297mm', display: 'flex' }}>
      {/* Left strip */}
      <div style={{ width: '38%', background: `linear-gradient(180deg, ${accent} 0%, ${accent}dd 100%)`, padding: '14mm 12mm', color: 'white', flexShrink: 0 }}>
        {p.profilePicture && (
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <img src={p.profilePicture} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.5)' }} />
          </div>
        )}
        <h1 style={{ fontSize: 14, fontWeight: 800, color: 'white', textAlign: 'center', margin: '0 0 2px' }}>{p.fullName}</h1>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 16 }}>{p.title}</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
          {p.email && <span>✉ {p.email}</span>}
          {p.phone && <span>📞 {p.phone}</span>}
          {p.location && <span>📍 {p.location}</span>}
          {p.linkedin && <span>🔗 {p.linkedin}</span>}
          {p.github && <span>💻 {p.github}</span>}
        </div>

        {!isHidden('skills') && skills.length > 0 && (
          <div style={{ marginBottom: sp.section }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Skills</div>
            {skills.slice(0, 10).map((s) => (
              <div key={s.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'white', marginBottom: 2 }}><span>{s.name}</span></div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: '75%', background: 'white', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isHidden('languages') && languages.length > 0 && (
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Languages</div>
            {languages.map((l) => (
              <div key={l.id} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'white', marginBottom: 2 }}><span>{l.language}</span><span>{l.proficiency}</span></div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${proficiencyWidth[l.proficiency] || 60}%`, background: 'white', borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right main */}
      <div style={{ flex: 1, padding: '14mm 14mm' }}>
        {!isHidden('summary') && summary && <p style={{ fontSize: fs.body, lineHeight: 1.8, color: '#374151', margin: `0 0 ${sp.section}` }}>{summary}</p>}
        {!isHidden('experience') && experience.length > 0 && (
          <>
            <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, margin: `0 0 ${sp.entry}`, borderBottom: `1px solid ${accent}30`, paddingBottom: 4 }}>Experience</h2>
            {experience.map((exp) => (
              <div key={exp.id} style={{ marginBottom: sp.entry, paddingLeft: 10, borderLeft: `3px solid ${accent}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700, fontSize: fs.body }}>{exp.title}</span>
                  <span style={{ fontSize: fs.contact, color: '#64748b' }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</span>
                </div>
                <div style={{ color: accent, fontWeight: 600, fontSize: fs.contact, marginBottom: 4 }}>{exp.company}</div>
                <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(exp.description)}</div>
              </div>
            ))}
          </>
        )}
        {!isHidden('education') && education.length > 0 && (
          <>
            <h2 style={{ fontSize: fs.section, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, margin: `${sp.section} 0 ${sp.entry}`, borderBottom: `1px solid ${accent}30`, paddingBottom: 4 }}>Education</h2>
            {education.map((edu) => (
              <div key={edu.id} style={{ marginBottom: sp.entry }}>
                <div style={{ fontWeight: 700, fontSize: fs.body }}>{edu.degree}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ''}</div>
                <div style={{ color: accent, fontSize: fs.contact }}>{edu.institution} · {edu.graduationYear}</div>
                {(edu.gpa || edu.honors) && <div style={{ fontSize: fs.contact, color: '#64748b' }}>{[edu.gpa && `GPA: ${edu.gpa}`, edu.honors].filter(Boolean).join(' · ')}</div>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
