import { create } from 'zustand'
import { saveUserData, getAllUserData } from './services/api'

const useStore = create((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────
  user: JSON.parse(localStorage.getItem('rs_user') || 'null'),
  isAuthModalOpen: false,
  selectedModel: 'ResumeModel_v5',

  login: (userData) => {
    localStorage.setItem('rs_user', JSON.stringify(userData))
    set({ user: userData, isAuthModalOpen: false })
    // Load user's saved data from server
    get().loadUserDataFromServer()
  },
  signup: (userData) => {
    localStorage.setItem('rs_user', JSON.stringify(userData))
    set({ user: userData, isAuthModalOpen: false })
    // If there's existing parsed data, save it to the new account
    const { parsedResume, resumeBuildData } = get()
    if (parsedResume) get().saveUserDataToServer('parsed_resume', parsedResume)
    if (resumeBuildData) get().saveUserDataToServer('resume_build', resumeBuildData)
  },
  logout: () => {
    localStorage.removeItem('rs_user')
    set({ user: null })
  },
  openAuthModal:  () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setSelectedModel: (model) => set({ selectedModel: model }),

  // ── Server Sync ──────────────────────────────────────────
  loadUserDataFromServer: async () => {
    try {
      const allData = await getAllUserData()
      const updates = {}
      if (allData.parsed_resume?.data) {
        updates.parsedResume = allData.parsed_resume.data
      }
      if (allData.resume_build?.data) {
        updates.resumeBuildData = allData.resume_build.data
        localStorage.setItem('rs_resume_build', JSON.stringify(allData.resume_build.data))
      }
      if (allData.job_description?.data?.text) {
        updates.jobDescription = allData.job_description.data.text
      }
      if (Object.keys(updates).length > 0) set(updates)
    } catch { /* user might not have saved data yet */ }
  },

  saveUserDataToServer: async (dataType, data) => {
    const user = get().user
    if (!user?.token) return
    try { await saveUserData(dataType, data) } catch { /* silent */ }
  },

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
  setJobDescription: (text)   => {
    set({ jobDescription: text })
    if (text && text.trim()) get().saveUserDataToServer('job_description', { text })
  },
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing:    (val)    => set({ isAnalyzing: val }),

  // ── Parsed Resume (editable) ─────────────────────────────
  parsedResume: null,
  // shape: { name, email, phone, linkedin, github, skills:[], education, experience, role, summary, projects, certifications }
  setParsedResume: (data) => {
    set({ parsedResume: data })
    if (data) get().saveUserDataToServer('parsed_resume', data)
  },
  updateParsedResume: (patch) =>
    set((s) => {
      const updated = { ...s.parsedResume, ...patch }
      get().saveUserDataToServer('parsed_resume', updated)
      return { parsedResume: updated }
    }),

  // ── Resume Build Data (sent to builder) ───────────────────
  resumeBuildData: null,
  setResumeBuildData: (data) => {
    localStorage.setItem('rs_resume_build', JSON.stringify(data))
    set({ resumeBuildData: data })
    get().saveUserDataToServer('resume_build', data)
  },

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
  clearAnalysis: () => {
    localStorage.removeItem('rs_resume_build')
    set({
      resumeFile:     null,
      resumeText:     '',
      jobDescription: '',
      analysisResult: null,
      isAnalyzing:    false,
      parsedResume:   null,
      resumeBuildData: null,
      jobConfig: {
        jdText: '',
        requiredSkills: [],
        experienceMin: 0,
        experienceMax: 10,
        role: '',
      },
      matchResult: null,
      step: 1,
    })
  },
}))

// Apply dark mode on initial load
if (localStorage.getItem('rs_dark') === 'true') {
  document.documentElement.classList.add('dark')
}

// Auto-load user data from server if already logged in (returning user)
const savedUser = JSON.parse(localStorage.getItem('rs_user') || 'null')
if (savedUser?.token) {
  useStore.getState().loadUserDataFromServer()
}

export default useStore
