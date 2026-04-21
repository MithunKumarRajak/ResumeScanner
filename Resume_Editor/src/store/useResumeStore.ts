import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ResumeDocument,
  ResumeData,
  StyleConfig,
  SectionId,
  VersionSnapshot,
  TemplateId,
} from '../types/resume';

const DEFAULT_SECTION_ORDER: SectionId[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'awards',
  'volunteer',
  'publications',
  'languages',
  'references',
];

const DEFAULT_STYLE: StyleConfig = {
  template: 'modern',
  accentColor: '#6366f1',
  headingFont: 'Inter',
  bodyFont: 'Inter',
  fontSize: 'medium',
  spacing: 'standard',
};

const DEFAULT_DATA: ResumeData = {
  personalInfo: {
    fullName: 'Alex Johnson',
    title: 'Senior Software Engineer',
    email: 'alex.johnson@email.com',
    phone: '+1 (555) 987-6543',
    location: 'San Francisco, CA',
    linkedin: 'linkedin.com/in/alexjohnson',
    github: 'github.com/alexjohnson',
    portfolio: 'alexjohnson.dev',
  },
  summary:
    'Innovative software engineer with 6+ years of experience building scalable web applications. Passionate about clean architecture, developer experience, and crafting products that users love. Expert in React, TypeScript, Node.js, and cloud-native solutions.',
  experience: [
    {
      id: '1',
      company: 'TechCorp Solutions',
      title: 'Senior Frontend Engineer',
      startDate: 'Jan 2022',
      endDate: 'Present',
      location: 'San Francisco, CA',
      remote: true,
      description:
        '- Led migration of legacy Angular portal to React 18, reducing bundle size by 42%\n- Architected a design system adopted by 3 product teams, saving 200+ engineering hours\n- Mentored 4 junior engineers through weekly code reviews and pair programming sessions\n- Improved core web vitals scores by 38% through performance optimization initiatives',
    },
    {
      id: '2',
      company: 'StartupXYZ',
      title: 'Full Stack Developer',
      startDate: 'Mar 2020',
      endDate: 'Dec 2021',
      location: 'Remote',
      remote: true,
      description:
        '- Built and shipped 5 product features from ideation to production in 6-week sprints\n- Designed RESTful APIs serving 50K+ daily active users with 99.9% uptime\n- Reduced CI/CD pipeline time from 18 minutes to 6 minutes through caching strategies',
    },
  ],
  education: [
    {
      id: '1',
      degree: 'Bachelor of Science',
      institution: 'University of California, Berkeley',
      fieldOfStudy: 'Computer Science',
      gpa: '3.8',
      graduationYear: '2019',
      honors: 'Magna Cum Laude',
      startYear: '2015',
    },
  ],
  skills: [
    { id: '1', name: 'React', category: 'Technical' },
    { id: '2', name: 'TypeScript', category: 'Technical' },
    { id: '3', name: 'Node.js', category: 'Technical' },
    { id: '4', name: 'AWS', category: 'Tools' },
    { id: '5', name: 'PostgreSQL', category: 'Technical' },
    { id: '6', name: 'Docker', category: 'Tools' },
    { id: '7', name: 'Leadership', category: 'Soft' },
    { id: '8', name: 'Python', category: 'Technical' },
  ],
  projects: [
    {
      id: '1',
      title: 'CloudFlow Dashboard',
      techStack: ['React', 'TypeScript', 'D3.js', 'FastAPI'],
      liveUrl: 'cloudflow.io',
      githubUrl: 'github.com/alexjohnson/cloudflow',
      description:
        '- Built a real-time infrastructure monitoring dashboard processing 1M+ events/day\n- Implemented WebSocket-based live updates with sub-100ms latency\n- Open-sourced with 800+ GitHub stars in the first month',
    },
  ],
  certifications: [
    {
      id: '1',
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023',
      credentialUrl: 'aws.amazon.com/verify',
    },
  ],
  awards: [
    {
      id: '1',
      title: 'Innovation Award',
      issuer: 'TechCorp Solutions',
      date: '2023',
      description: 'Recognized for architecting the design system initiative.',
    },
  ],
  volunteer: [],
  publications: [],
  languages: [
    { id: '1', language: 'English', proficiency: 'Native' },
    { id: '2', language: 'Spanish', proficiency: 'B2' },
  ],
  references: [],
  referencesOnRequest: true,
  customSections: [],
};

const EMPTY_DATA: ResumeData = {
  personalInfo: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  awards: [],
  volunteer: [],
  publications: [],
  languages: [],
  references: [],
  referencesOnRequest: false,
  customSections: [],
};

function createNewResume(name: string): ResumeDocument {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    data: DEFAULT_DATA,
    style: DEFAULT_STYLE,
    sectionOrder: DEFAULT_SECTION_ORDER,
    hiddenSections: [],
  };
}

interface ResumeStore {
  // Resumes
  resumes: ResumeDocument[];
  activeResumeId: string | null;
  versionHistory: VersionSnapshot[];

  // UI State
  theme: 'light' | 'dark';
  activeView: 'landing' | 'dashboard' | 'editor';
  mobileTab: 'edit' | 'preview';
  showOnboarding: boolean;
  apiKey: string;

  // Undo/Redo
  undoStack: ResumeData[];
  redoStack: ResumeData[];

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  setActiveView: (view: 'dashboard' | 'editor') => void;
  setMobileTab: (tab: 'edit' | 'preview') => void;
  setShowOnboarding: (show: boolean) => void;
  setApiKey: (key: string) => void;

  createResume: (name?: string) => string;
  createEmptyResume: (name?: string) => string;
  importParsedData: (data: ResumeData, name?: string) => string;
  cloneResume: (id: string) => void;
  deleteResume: (id: string) => void;
  renameResume: (id: string, name: string) => void;
  openResume: (id: string) => void;

  updateData: (data: Partial<ResumeData>) => void;
  updateStyle: (style: Partial<StyleConfig>) => void;
  updateSectionOrder: (order: SectionId[]) => void;
  toggleHiddenSection: (section: SectionId) => void;

  saveSnapshot: (label?: string) => void;
  restoreSnapshot: (snapshotId: string) => void;

  undo: () => void;
  redo: () => void;
  pushUndoState: () => void;

  getActiveResume: () => ResumeDocument | null;
  setTemplate: (template: TemplateId) => void;
}

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => {
      const getActive = (): ResumeDocument | null => {
        const { resumes, activeResumeId } = get();
        return resumes.find((r) => r.id === activeResumeId) ?? null;
      };

      const updateActive = (updater: (r: ResumeDocument) => ResumeDocument) => {
        set((state) => ({
          resumes: state.resumes.map((r) =>
            r.id === state.activeResumeId ? updater({ ...r, updatedAt: new Date().toISOString() }) : r
          ),
        }));
      };

      return {
        resumes: [],
        activeResumeId: null,
        versionHistory: [],
        theme: 'dark',
        activeView: 'landing',
        mobileTab: 'edit',
        showOnboarding: true,
        apiKey: '',
        undoStack: [],
        redoStack: [],

        setTheme: (theme) => set({ theme }),
        setActiveView: (view) => set({ activeView: view }),
        setMobileTab: (tab) => set({ mobileTab: tab }),
        setShowOnboarding: (show) => set({ showOnboarding: show }),
        setApiKey: (key) => set({ apiKey: key }),

        createResume: (name = 'Untitled Resume') => {
          const resume = createNewResume(name);
          set((state) => ({ resumes: [...state.resumes, resume] }));
          return resume.id;
        },

        createEmptyResume: (name = 'New Resume') => {
          const resume = {
            ...createNewResume(name),
            data: EMPTY_DATA,
          };
          set((state) => ({ 
            resumes: [...state.resumes, resume],
            activeResumeId: resume.id,
            activeView: 'editor'
          }));
          return resume.id;
        },

        importParsedData: (data, name = 'Parsed Resume') => {
          const resume = {
            ...createNewResume(name),
            data: { ...EMPTY_DATA, ...data }, // Ensure all fields exist
          };
          set((state) => ({ 
            resumes: [...state.resumes, resume],
            activeResumeId: resume.id,
            activeView: 'editor'
          }));
          return resume.id;
        },

        cloneResume: (id) => {
          const source = get().resumes.find((r) => r.id === id);
          if (!source) return;
          const clone: ResumeDocument = {
            ...source,
            id: crypto.randomUUID(),
            name: `${source.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((state) => ({ resumes: [...state.resumes, clone] }));
        },

        deleteResume: (id) => {
          set((state) => {
            const remaining = state.resumes.filter((r) => r.id !== id);
            return {
              resumes: remaining,
              activeResumeId: state.activeResumeId === id ? (remaining[0]?.id ?? null) : state.activeResumeId,
              activeView: remaining.length === 0 ? 'dashboard' : state.activeView,
            };
          });
        },

        renameResume: (id, name) => {
          set((state) => ({
            resumes: state.resumes.map((r) => (r.id === id ? { ...r, name } : r)),
          }));
        },

        openResume: (id) => {
          set({ activeResumeId: id, activeView: 'editor', undoStack: [], redoStack: [] });
        },

        updateData: (data) => {
          get().pushUndoState();
          updateActive((r) => ({ ...r, data: { ...r.data, ...data } }));
        },

        updateStyle: (style) => {
          updateActive((r) => ({ ...r, style: { ...r.style, ...style } }));
        },

        updateSectionOrder: (order) => {
          updateActive((r) => ({ ...r, sectionOrder: order }));
        },

        toggleHiddenSection: (section) => {
          updateActive((r) => ({
            ...r,
            hiddenSections: r.hiddenSections.includes(section)
              ? r.hiddenSections.filter((s) => s !== section)
              : [...r.hiddenSections, section],
          }));
        },

        saveSnapshot: (label) => {
          const active = getActive();
          if (!active) return;
          const snapshot: VersionSnapshot = {
            id: crypto.randomUUID(),
            resumeId: active.id,
            timestamp: new Date().toISOString(),
            label,
            data: active.data,
            style: active.style,
          };
          set((state) => ({
            versionHistory: [snapshot, ...state.versionHistory].slice(0, 50),
          }));
        },

        restoreSnapshot: (snapshotId) => {
          const snap = get().versionHistory.find((v) => v.id === snapshotId);
          if (!snap) return;
          get().pushUndoState();
          updateActive((r) => ({ ...r, data: snap.data, style: snap.style }));
        },

        undo: () => {
          const { undoStack, activeResumeId } = get();
          if (undoStack.length === 0 || !activeResumeId) return;
          const prev = undoStack[undoStack.length - 1];
          const active = getActive();
          if (!active) return;
          set((state) => ({
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, active.data],
          }));
          updateActive((r) => ({ ...r, data: prev }));
        },

        redo: () => {
          const { redoStack } = get();
          if (redoStack.length === 0) return;
          const next = redoStack[redoStack.length - 1];
          const active = getActive();
          if (!active) return;
          set((state) => ({
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, active.data],
          }));
          updateActive((r) => ({ ...r, data: next }));
        },

        pushUndoState: () => {
          const active = getActive();
          if (!active) return;
          set((state) => ({
            undoStack: [...state.undoStack, active.data].slice(-30),
            redoStack: [],
          }));
        },

        getActiveResume: getActive,

        setTemplate: (template) => {
          updateActive((r) => ({ ...r, style: { ...r.style, template } }));
        },
      };
    },
    {
      name: 'resumepro-store-v2',
      partialize: (state) => ({
        resumes: state.resumes,
        activeResumeId: state.activeResumeId,
        versionHistory: state.versionHistory,
        theme: state.theme,
        showOnboarding: state.showOnboarding,
        apiKey: state.apiKey,
      }),
    }
  )
);
