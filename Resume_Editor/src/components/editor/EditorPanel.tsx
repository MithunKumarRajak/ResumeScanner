import { useState } from 'react';
import { Eye, EyeOff, ChevronDown, ChevronUp, User, FileText, Briefcase, GraduationCap, Code, Award, Star, Heart, BookOpen, Languages, Users, Plus } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import type { SectionId } from '../../types/resume';
import PersonalInfoSection from './sections/PersonalInfoSection';
import SummarySection from './sections/SummarySection';
import ExperienceSection from './sections/ExperienceSection';
import EducationSection from './sections/EducationSection';
import SkillsSection from './sections/SkillsSection';
import ProjectsSection from './sections/ProjectsSection';
import CertificationsSection from './sections/CertificationsSection';
import AwardsSection from './sections/AwardsSection';
import VolunteerSection from './sections/VolunteerSection';
import PublicationsSection from './sections/PublicationsSection';
import LanguagesSection from './sections/LanguagesSection';
import ReferencesSection from './sections/ReferencesSection';
import StylePanel from './StylePanel';

const SECTION_META: Record<string, { label: string; icon: React.ReactNode; component: React.FC }> = {
  personalInfo: { label: 'Personal Info', icon: <User size={14} />, component: PersonalInfoSection },
  summary: { label: 'Summary', icon: <FileText size={14} />, component: SummarySection },
  experience: { label: 'Experience', icon: <Briefcase size={14} />, component: ExperienceSection },
  education: { label: 'Education', icon: <GraduationCap size={14} />, component: EducationSection },
  skills: { label: 'Skills', icon: <Code size={14} />, component: SkillsSection },
  projects: { label: 'Projects', icon: <Code size={14} />, component: ProjectsSection },
  certifications: { label: 'Certifications', icon: <Award size={14} />, component: CertificationsSection },
  awards: { label: 'Awards', icon: <Star size={14} />, component: AwardsSection },
  volunteer: { label: 'Volunteer', icon: <Heart size={14} />, component: VolunteerSection },
  publications: { label: 'Publications', icon: <BookOpen size={14} />, component: PublicationsSection },
  languages: { label: 'Languages', icon: <Languages size={14} />, component: LanguagesSection },
  references: { label: 'References', icon: <Users size={14} />, component: ReferencesSection },
};

const ALL_SECTIONS: SectionId[] = [
  'personalInfo', 'summary', 'experience', 'education', 'skills',
  'projects', 'certifications', 'awards', 'volunteer', 'publications',
  'languages', 'references',
];

export default function EditorPanel() {
  const { getActiveResume, toggleHiddenSection } = useResumeStore();
  const resume = getActiveResume();
  const [expandedSection, setExpandedSection] = useState<string>('personalInfo');
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  if (!resume) return null;
  const { hiddenSections } = resume;

  const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? '' : id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Tab Bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {(['content', 'style'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            flex: 1, padding: '12px', fontSize: 13, fontWeight: 600, borderBottom: '2px solid',
            borderBottomColor: activeTab === tab ? 'var(--accent)' : 'transparent',
            color: activeTab === tab ? 'var(--accent)' : 'var(--text-secondary)',
            background: 'none', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
          }}>
            {tab === 'content' ? '✏️ Content' : '🎨 Style & Template'}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="editor-pane-content">
        {activeTab === 'style' ? (
          <StylePanel />
        ) : (
          ALL_SECTIONS.map((sectionId) => {
            const meta = SECTION_META[sectionId];
            if (!meta) return null;
            const isHidden = hiddenSections.includes(sectionId);
            const isExpanded = expandedSection === sectionId;
            const Component = meta.component;

            return (
              <div key={sectionId} className="card" style={{ opacity: isHidden ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                <div className="section-header" onClick={() => toggleSection(sectionId)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--accent)' }}>{meta.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                    {isHidden && <span className="tag tag-warning" style={{ fontSize: 10, padding: '1px 6px' }}>Hidden</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      className="btn-icon"
                      onClick={(e) => { e.stopPropagation(); toggleHiddenSection(sectionId); }}
                      title={isHidden ? 'Show section' : 'Hide from resume'}
                      style={{ width: 26, height: 26, color: isHidden ? 'var(--text-muted)' : 'var(--accent)' }}
                    >
                      {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {isExpanded ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
                  </div>
                </div>
                {isExpanded && <Component />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
