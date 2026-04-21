import type { TemplateProps } from '../templateUtils';
import { getFontSize, getSpacing, renderBullets } from '../templateUtils';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

export default function ModernTemplate({ data, style, hiddenSections }: TemplateProps) {
  const fs = getFontSize(style.fontSize);
  const sp = getSpacing(style.spacing);
  const { personalInfo: p, summary, experience, education, skills, projects, certifications, awards, volunteer, publications, languages, references, referencesOnRequest } = data;
  const accent = style.accentColor;
  const font = style.headingFont || 'Inter';
  const isHidden = (s: string) => hiddenSections.includes(s);

  const SectionTitle = ({ title }: { title: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: sp.entry, marginTop: sp.section }}>
      <div style={{ width: 3, height: 16, background: accent, borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontSize: fs.section, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: accent, fontFamily: font, margin: 0 }}>
        {title}
      </h2>
    </div>
  );

  return (
    <div style={{ fontFamily: font, color: '#1a1a1a', padding: '20mm', lineHeight: 1.5, background: 'white', minHeight: '297mm' }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: fs.name, fontWeight: 800, color: '#0f172a', fontFamily: font, margin: 0, letterSpacing: -0.5 }}>{p.fullName}</h1>
            <div style={{ fontSize: fs.title, color: accent, fontWeight: 600, marginTop: 3, letterSpacing: 0.3 }}>{p.title}</div>
          </div>
          {p.profilePicture && (
            <img src={p.profilePicture} alt="Profile" style={{
              width: 72, height: 72, objectFit: 'cover', flexShrink: 0,
              borderRadius: p.photoShape === 'square' ? 4 : p.photoShape === 'rounded' ? 12 : '50%',
              border: `2px solid ${accent}`,
            }} />
          )}
        </div>
        {/* Contact Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginTop: 10, fontSize: fs.contact, color: '#475569' }}>
          {p.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={10} color={accent} />{p.email}</span>}
          {p.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={10} color={accent} />{p.phone}</span>}
          {p.location && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} color={accent} />{p.location}</span>}
          {p.linkedin && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} color={accent} />{p.linkedin}</span>}
          {p.github && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} color={accent} />{p.github}</span>}
          {p.portfolio && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Globe size={10} color={accent} />{p.portfolio}</span>}
        </div>
      </div>

      {/* Summary */}
      {!isHidden('summary') && summary && (
        <>
          <SectionTitle title="Professional Summary" />
          <p style={{ fontSize: fs.body, color: '#374151', lineHeight: 1.7, margin: `0 0 ${sp.section}`, fontStyle: 'italic' }}>{summary}</p>
        </>
      )}

      {/* Experience */}
      {!isHidden('experience') && experience.length > 0 && (
        <>
          <SectionTitle title="Work Experience" />
          {experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: sp.entry }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700, fontSize: fs.body, color: '#0f172a' }}>{exp.title}</div>
                <div style={{ fontSize: fs.contact, color: '#64748b', flexShrink: 0, marginLeft: 8 }}>{exp.startDate}{exp.endDate ? ` – ${exp.endDate}` : ''}</div>
              </div>
              <div style={{ fontSize: fs.contact, color: accent, fontWeight: 600, marginBottom: 4 }}>
                {exp.company}{exp.location ? ` · ${exp.location}` : ''}{exp.remote ? ' (Remote)' : ''}
              </div>
              <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(exp.description)}</div>
            </div>
          ))}
        </>
      )}

      {/* Education */}
      {!isHidden('education') && education.length > 0 && (
        <>
          <SectionTitle title="Education" />
          {education.map((edu) => (
            <div key={edu.id} style={{ marginBottom: sp.entry }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 700, fontSize: fs.body, color: '#0f172a' }}>{edu.degree}{edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}</div>
                <div style={{ fontSize: fs.contact, color: '#64748b' }}>{edu.startYear ? `${edu.startYear} – ` : ''}{edu.graduationYear}</div>
              </div>
              <div style={{ fontSize: fs.contact, color: accent, fontWeight: 600 }}>{edu.institution}</div>
              {(edu.gpa || edu.honors) && (
                <div style={{ fontSize: fs.contact, color: '#64748b' }}>{[edu.gpa ? `GPA: ${edu.gpa}` : '', edu.honors].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          ))}
        </>
      )}

      {/* Skills */}
      {!isHidden('skills') && skills.length > 0 && (
        <>
          <SectionTitle title="Skills" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: sp.section }}>
            {skills.map((s) => (
              <span key={s.id} style={{ padding: '2px 10px', background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 9999, fontSize: fs.contact, color: accent, fontWeight: 500 }}>
                {s.name}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Projects */}
      {!isHidden('projects') && projects.length > 0 && (
        <>
          <SectionTitle title="Projects" />
          {projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: sp.entry }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontWeight: 700, fontSize: fs.body, color: '#0f172a' }}>{proj.title}</span>
                <div style={{ display: 'flex', gap: 8, fontSize: fs.contact }}>
                  {proj.liveUrl && <span style={{ color: accent }}>{proj.liveUrl}</span>}
                  {proj.githubUrl && <span style={{ color: '#64748b' }}>{proj.githubUrl}</span>}
                </div>
              </div>
              {proj.techStack.length > 0 && (
                <div style={{ fontSize: fs.contact, color: accent, fontWeight: 600, marginBottom: 3 }}>{proj.techStack.join(' · ')}</div>
              )}
              <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(proj.description)}</div>
            </div>
          ))}
        </>
      )}

      {/* Certifications */}
      {!isHidden('certifications') && certifications.length > 0 && (
        <>
          <SectionTitle title="Certifications" />
          <div style={{ marginBottom: sp.section }}>
            {certifications.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: sp.item, fontSize: fs.body }}>
                <div><strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ''}</div>
                <div style={{ color: '#64748b', flexShrink: 0 }}>{c.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Awards */}
      {!isHidden('awards') && awards.length > 0 && (
        <>
          <SectionTitle title="Awards & Achievements" />
          <div style={{ marginBottom: sp.section }}>
            {awards.map((a) => (
              <div key={a.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{a.title}</strong><span style={{ color: '#64748b' }}>{a.date}</span>
                </div>
                {a.issuer && <div style={{ color: '#475569', fontSize: fs.contact }}>{a.issuer}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Volunteer */}
      {!isHidden('volunteer') && volunteer.length > 0 && (
        <>
          <SectionTitle title="Volunteer Experience" />
          {volunteer.map((v) => (
            <div key={v.id} style={{ marginBottom: sp.entry }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: fs.body }}>{v.role} @ {v.organization}</strong>
                <span style={{ color: '#64748b', fontSize: fs.contact }}>{v.startDate}{v.endDate ? ` – ${v.endDate}` : ''}</span>
              </div>
              <div style={{ fontSize: fs.body, color: '#374151' }}>{renderBullets(v.description)}</div>
            </div>
          ))}
        </>
      )}

      {/* Publications */}
      {!isHidden('publications') && publications.length > 0 && (
        <>
          <SectionTitle title="Publications & Research" />
          <div style={{ marginBottom: sp.section }}>
            {publications.map((pub) => (
              <div key={pub.id} style={{ marginBottom: sp.item, fontSize: fs.body }}>
                <em>"{pub.title}"</em>{pub.journal ? ` — ${pub.journal}` : ''}{pub.date ? `, ${pub.date}` : ''}
                {pub.doiUrl && <span style={{ color: accent }}> [{pub.doiUrl}]</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Languages */}
      {!isHidden('languages') && languages.length > 0 && (
        <>
          <SectionTitle title="Languages" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: sp.section }}>
            {languages.map((l) => (
              <span key={l.id} style={{ fontSize: fs.body }}><strong>{l.language}</strong> <span style={{ color: '#64748b' }}>({l.proficiency})</span></span>
            ))}
          </div>
        </>
      )}

      {/* References */}
      {!isHidden('references') && (
        <>
          <SectionTitle title="References" />
          {referencesOnRequest ? (
            <p style={{ fontSize: fs.body, color: '#64748b', fontStyle: 'italic', marginBottom: sp.section }}>Available upon request.</p>
          ) : references.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: sp.section }}>
              {references.map((r) => (
                <div key={r.id} style={{ fontSize: fs.contact }}>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div style={{ color: '#475569' }}>{r.title}{r.company ? ` · ${r.company}` : ''}</div>
                  <div style={{ color: accent }}>{r.email}</div>
                  <div style={{ color: '#64748b' }}>{r.phone}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
