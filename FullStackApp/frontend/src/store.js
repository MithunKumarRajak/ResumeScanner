import { create } from 'zustand'
import { saveUserData, getAllUserData, apiLogout } from './services/api'

function sanitizeUser(userData) {
  if (!userData) return null
  return {
    ...userData,
    token: userData.token || userData.access_token || null,
  }
}

const useStore = create((set, get) => ({
  //  Auth ─
  user: (() => {
    const saved = JSON.parse(localStorage.getItem('rs_user') || 'null')
    if (!saved) return null
    const safe = sanitizeUser(saved)
    if (safe && safe !== saved) {
      localStorage.setItem('rs_user', JSON.stringify(safe))
    }
    return safe?.token ? safe : null
  })(),
  isAuthModalOpen: false,
  authModalTab: 'login',
  selectedModel: 'ResumeModel_v6',

  login: (userData) => {
    const safeUser = sanitizeUser(userData)
    if (safeUser) {
      localStorage.setItem('rs_user', JSON.stringify(safeUser))
    }
    set({ user: safeUser, isAuthModalOpen: false })
    // Load user's saved data from server
    get().loadUserDataFromServer()
  },
  signup: (userData) => {
    const safeUser = sanitizeUser(userData)
    if (safeUser) {
      localStorage.setItem('rs_user', JSON.stringify(safeUser))
    }
    set({ user: safeUser, isAuthModalOpen: false })
    // If there's existing parsed data, save it to the new account
    const { parsedResume, resumeBuildData } = get()
    if (parsedResume) get().saveUserDataToServer('parsed_resume', parsedResume)
    if (resumeBuildData) get().saveUserDataToServer('resume_build', resumeBuildData)
  },
  logout: () => {
    void apiLogout().catch(() => {})
    localStorage.removeItem('rs_user')
    localStorage.removeItem('rs_resume_build')
    localStorage.removeItem('rs_resume_id')
    set({
      user: null,
      resumeFile: null,
      resumeText: '',
      jobDescription: '',
      analysisResult: null,
      isAnalyzing: false,
      parsedResume: null,
      resumeBuildData: null,
      matchResult: null,
      step: 1,
    })
  },
  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false, authModalTab: 'login' }),
  setAuthModalTab: (tab = 'login') => set({ authModalTab: tab }),
  setSelectedModel: (model) => set({ selectedModel: model }),

  //  Server Sync 
  loadUserDataFromServer: async () => {
    if (!get().user) return
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
    if (!get().user) return
    try { await saveUserData(dataType, data) } catch { /* silent */ }
  },

  //  Dark Mode 
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

  //  View (candidate | recruiter) ─
  view: 'candidate',
  setView: (v) => set({ view: v }),

  //  Resume Upload & Raw Analysis ─
  resumeFile: null,
  currentResumeId: localStorage.getItem('rs_resume_id') || null,
  resumeText: '',
  jobDescription: '',
  analysisResult: null,
  isAnalyzing: false,

  setResumeFile: (file) => set({ resumeFile: file }),
  setCurrentResumeId: (resumeId) => {
    if (resumeId) {
      localStorage.setItem('rs_resume_id', resumeId)
    } else {
      localStorage.removeItem('rs_resume_id')
    }
    set({ currentResumeId: resumeId || null })
  },
  setResumeText: (text) => set({ resumeText: text }),
  setJobDescription: (text) => {
    set({ jobDescription: text })
    if (text && text.trim()) get().saveUserDataToServer('job_description', { text })
  },
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setIsAnalyzing: (val) => set({ isAnalyzing: val }),

  //  Parsed Resume (editable) 
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

  //  Resume Build Data (sent to builder) ─
  resumeBuildData: null,
  setResumeBuildData: (data) => {
    localStorage.setItem('rs_resume_build', JSON.stringify(data))
    set({ resumeBuildData: data })
    get().saveUserDataToServer('resume_build', data)
  },

  //  Job Config ─
  jobConfig: {
    jdText: '',
    requiredSkills: [],
    experienceMin: 0,
    experienceMax: 10,
    role: '',
  },
  setJobConfig: (patch) =>
    set((s) => ({ jobConfig: { ...s.jobConfig, ...patch } })),

  //  Match Result ─
  matchResult: null,
  // shape: { matchScore, matchingSkills:[], missingSkills:[], category, confidence, recommendation }
  setMatchResult: (data) => set({ matchResult: data }),

  //  Recruiter: Candidate Session List 
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

  //  Step (candidate workflow) 
  step: 1, // 1=Upload 2=Edit 3=JobConfig 4=Results
  setStep: (n) => set({ step: n }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, 4) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, 1) })),

  //  Clear Everything 
  clearAnalysis: () => {
    localStorage.removeItem('rs_resume_build')
    localStorage.removeItem('rs_resume_id')
    set({
      resumeFile: null,
      currentResumeId: null,
      resumeText: '',
      jobDescription: '',
      analysisResult: null,
      isAnalyzing: false,
      parsedResume: null,
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

// Auth-gated initialization: only load resume data if logged in
const savedUser = JSON.parse(localStorage.getItem('rs_user') || 'null')
if (savedUser?.token || savedUser?.access_token) {
  useStore.getState().loadUserDataFromServer()
} else {
  // Not authenticated → clear any stale resume data from localStorage
  localStorage.removeItem('rs_resume_build')
  localStorage.removeItem('rs_resume_id')
  useStore.setState({
    parsedResume: null,
    resumeBuildData: null,
    resumeFile: null,
    currentResumeId: null,
    resumeText: '',
    jobDescription: '',
  })
}

export default useStore
