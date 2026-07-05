import { useRef } from 'react';
import { useResumeStore } from '../../store/useResumeStore';
import ModernTemplate from './templates/ModernTemplate';
import ClassicTemplate from './templates/ClassicTemplate';
import TwoColumnTemplate from './templates/TwoColumnTemplate';
import { MinimalTemplate, ExecutiveTemplate, TechTemplate, ATSSafeTemplate, CreativeTemplate, AcademicTemplate, InfographicTemplate } from './templates/OtherTemplates';

export default function PreviewPanel() {
  const { getActiveResume } = useResumeStore();
  const resume = getActiveResume();
  const previewRef = useRef<HTMLDivElement>(null);

  if (!resume) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
      No resume selected
    </div>
  );

  const { data, style, hiddenSections } = resume;
  const props = { data, style, hiddenSections };

  const TemplateComponent = {
    modern: ModernTemplate,
    classic: ClassicTemplate,
    minimal: MinimalTemplate,
    executive: ExecutiveTemplate,
    tech: TechTemplate,
    academic: AcademicTemplate,
    infographic: InfographicTemplate,
    'two-column': TwoColumnTemplate,
    'ats-safe': ATSSafeTemplate,
    creative: CreativeTemplate,
  }[style.template] || ModernTemplate;

  return (
    <div
      ref={previewRef}
      id="resume-preview-root"
      className="resume-a4"
      style={{ fontFamily: style.bodyFont ? `'${style.bodyFont}', sans-serif` : undefined }}
    >
      <TemplateComponent {...props} />
    </div>
  );
}

export { };
