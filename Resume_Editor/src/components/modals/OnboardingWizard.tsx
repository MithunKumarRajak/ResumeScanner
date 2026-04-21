import { useState } from 'react';
import { ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import toast from 'react-hot-toast';

const TEMPLATES = ['modern', 'classic', 'minimal', 'creative', 'tech', 'two-column', 'executive', 'academic', 'ats-safe', 'infographic'];
const TEMPLATE_EMOJI: Record<string, string> = {
  modern: '⚡', classic: '📄', minimal: '🌿', creative: '🎨',
  tech: '💻', 'two-column': '⬜', executive: '👔', academic: '🎓', 'ats-safe': '🤖', infographic: '📊',
};

export default function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { createResume, openResume, updateData, updateStyle, getActiveResume } = useResumeStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [template, setTemplate] = useState('modern');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [resumeId, setResumeId] = useState<string | null>(null);

  const steps = [
    {
      title: "Welcome to ResumePro ✨",
      subtitle: "Let's set up your first resume in 4 quick steps",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Your Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alex Johnson" style={{ fontSize: 16, padding: '12px 14px' }} autoFocus />
          </div>
          <div className="form-group">
            <label>Your Job Title / Role</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Software Engineer" style={{ fontSize: 16, padding: '12px 14px' }} />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={{ fontSize: 16, padding: '12px 14px' }} />
          </div>
        </div>
      ),
      canProceed: name.trim().length > 1,
    },
    {
      title: "Choose Your Template 🎨",
      subtitle: "You can change this anytime in the Style panel",
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {TEMPLATES.map((t) => (
            <button key={t} onClick={() => setTemplate(t)} style={{
              padding: '14px 8px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              border: `2px solid ${template === t ? 'var(--accent)' : 'var(--border)'}`,
              background: template === t ? 'var(--accent-light)' : 'var(--bg-card)',
              transition: 'all 0.15s',
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{TEMPLATE_EMOJI[t]}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: template === t ? 'var(--accent)' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{t}</div>
              {template === t && <Check size={12} color="var(--accent)" style={{ marginTop: 4 }} />}
            </button>
          ))}
        </div>
      ),
      canProceed: true,
    },
    {
      title: "Add Your Top Skills 🚀",
      subtitle: "Add at least 3 skills to get started",
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && skillInput.trim()) {
                  e.preventDefault();
                  if (!skills.includes(skillInput.trim())) setSkills(prev => [...prev, skillInput.trim()]);
                  setSkillInput('');
                }
              }}
              placeholder="e.g. React, Python, Leadership..."
              style={{ flex: 1 }}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={() => { if (skillInput.trim() && !skills.includes(skillInput.trim())) { setSkills(p => [...p, skillInput.trim()]); setSkillInput(''); } }}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map((s) => (
              <span key={s} className="tag tag-accent">
                {s}
                <button onClick={() => setSkills(p => p.filter(x => x !== s))} style={{ marginLeft: 4, background: 'none', cursor: 'pointer', color: 'var(--accent)', lineHeight: 1 }}>×</button>
              </span>
            ))}
            {skills.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No skills added yet</p>}
          </div>
          <div style={{ background: 'var(--bg-app)', padding: '10px 12px', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            💡 Suggested: React · Python · TypeScript · Node.js · SQL · Docker · Leadership · AWS
          </div>
        </div>
      ),
      canProceed: skills.length >= 1,
    },
    {
      title: "All Set! 🎉",
      subtitle: "Your resume is ready to edit",
      content: (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <strong>{name}</strong>'s resume has been created with the <strong style={{ color: 'var(--accent)', textTransform: 'capitalize' }}>{template}</strong> template and {skills.length} skill{skills.length !== 1 ? 's' : ''}.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
            Click "Open Editor" to start filling in your experience, education, and more!
          </p>
        </div>
      ),
      canProceed: true,
    },
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step === 0) {
      // Create resume on first step completion
      const id = createResume(name.trim() || 'My Resume');
      setResumeId(id);
    }
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      // Finalize and open
      if (resumeId) {
        openResume(resumeId);
        // Apply initial data
        updateData({
          personalInfo: { fullName: name, title, email, phone: '', location: '', linkedin: '', github: '', portfolio: '' },
          skills: skills.map((s, i) => ({ id: `skill-${i}`, name: s, category: 'Technical' as const })),
          summary: '',
          experience: [], education: [], projects: [], certifications: [], awards: [], volunteer: [], publications: [], languages: [], references: [], referencesOnRequest: true, customSections: [],
        });
        updateStyle({ template: template as any });
      }
      onComplete();
      toast.success('Welcome to ResumePro! 🎉');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 300 }}>
      <div className="modal modal-md" style={{ maxWidth: 580 }}>
        {/* Step indicators */}
        <div style={{ padding: '20px 24px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="onboarding-step-indicator">
            {steps.map((_, i) => (
              <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{currentStep.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{currentStep.subtitle}</p>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '20px 24px' }}>
          {currentStep.content}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            className="btn btn-ghost"
            onClick={() => step > 0 ? setStep(s => s - 1) : onComplete()}
            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
          >
            {step > 0 ? <><ChevronLeft size={14} /> Back</> : 'Skip Setup'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!currentStep.canProceed}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {step === steps.length - 1 ? (
              <><Sparkles size={14} /> Open Editor</>
            ) : (
              <>Next <ChevronRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
