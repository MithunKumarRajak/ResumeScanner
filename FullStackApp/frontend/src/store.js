import { create } from 'zustand'

const useStore = create((set) => ({
  // ── Auth ─────────────────────────────────────────────────
  user: JSON.parse(localStorage.getItem('rs_user') || 'null'),
  isAuthModalOpen: false,

  login: (userData) => {
    localStorage.setItem('rs_user', JSON.stringify(userData))
    set({ user: userData, isAuthModalOpen: false })
  },
  signup: (userData) => {
    localStorage.setItem('rs_user', JSON.stringify(userData))
    set({ user: userData, isAuthModalOpen: false })
  },
  logout: () => {
    localStorage.removeItem('rs_user')
    set({ user: null })
  },
  openAuthModal:  () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  // ── Dark Mode ────────────────────────────────────────────
  darkMode: localStorage.getItem('rs_dark') === 'true',
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode
      localStorage.setItem('rs_dark', String(next))
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return { darkMode: next }
    }),

  // ── View (candidate | recruiter) ─────────────────────────
  view: 'candidate',
  setView: (v) => set({ view: v }),

  // ── Resume Upload & Raw Analysis ─────────────────────────
  resumeFile:      null,
  resumeText:      '',
  jobDescription:  '',
  analysisResult:  null,
  isAnalyzing:     false,

  setResumeFile:     (file)   => set({ resumeFile: file }),
  setResumeText:     (text)   => set({ resumeText: text }),
  setJobDescription: (text)   => set({ jobDescription: text }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing:    (val)    => set({ isAnalyzing: val }),

  // ── Parsed Resume (editable) ─────────────────────────────
  parsedResume: null,
  // shape: { name, skills:[], education, experience, role }
  setParsedResume: (data) => set({ parsedResume: data }),
  updateParsedResume: (patch) =>
    set((s) => ({ parsedResume: { ...s.parsedResume, ...patch } })),

  // ── Job Config ───────────────────────────────────────────
  jobConfig: {
    jdText: '',
    requiredSkills: [],
    experienceMin: 0,
    experienceMax: 10,
    role: '',
  },
  setJobConfig: (patch) =>
    set((s) => ({ jobConfig: { ...s.jobConfig, ...patch } })),

  // ── Match Result ─────────────────────────────────────────
  matchResult: null,
  // shape: { matchScore, matchingSkills:[], missingSkills:[], category, confidence, recommendation }
  setMatchResult: (data) => set({ matchResult: data }),

  // ── Recruiter: Candidate Session List ────────────────────
  candidates: JSON.parse(sessionStorage.getItem('rs_candidates') || '[]'),
  addCandidate: (candidate) =>
    set((s) => {
      const updated = [candidate, ...s.candidates].slice(0, 50)
      sessionStorage.setItem('rs_candidates', JSON.stringify(updated))
      return { candidates: updated }
    }),
  clearCandidates: () => {
    sessionStorage.removeItem('rs_candidates')
    set({ candidates: [] })
  },

  // ── Step (candidate workflow) ─────────────────────────────
  step: 1, // 1=Upload 2=Edit 3=JobConfig 4=Results
  setStep:  (n) => set({ step: n }),
  nextStep: ()  => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  prevStep: ()  => set((s) => ({ step: Math.max(s.step - 1, 1) })),

  // ── Clear Everything ─────────────────────────────────────
  clearAnalysis: () =>
    set({
      resumeFile:     null,
      resumeText:     '',
      jobDescription: '',
      analysisResult: null,
      isAnalyzing:    false,
      parsedResume:   null,
      jobConfig: {
        jdText: '',
        requiredSkills: [],
        experienceMin: 0,
        experienceMax: 10,
        role: '',
      },
      matchResult: null,
      step: 1,
    }),
}))

// Apply dark mode on initial load
if (localStorage.getItem('rs_dark') === 'true') {
  document.documentElement.classList.add('dark')
}

export default useStore
