import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Request interceptor ──────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('rs_user') || 'null')
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor ─────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rs_user')
    }
    return Promise.reject(error)
  }
)

// ── Typed helpers ────────────────────────────────────────

/**
 * Predict resume category and optionally compute match score.
 * @param {string} resumeText
 * @param {string} [jobDescription]
 */
export async function predictResume(resumeText, jobDescription = '', modelVersion = '') {
  const payload = { resume_text: resumeText }
  if (jobDescription && jobDescription.trim()) {
    payload.job_description = jobDescription
  }
  if (modelVersion && String(modelVersion).trim()) {
    payload.model_version = modelVersion
  }
  const { data } = await api.post('/predict', payload)
  return data
}

/**
 * Fetch available model versions and metadata from backend.
 */
export async function getModels() {
  const { data } = await api.get('/models')
  return data.models || []
}

/**
 * Fetch all available job categories from the backend.
 */
export async function getCategories() {
  const { data } = await api.get('/categories')
  return data.categories || []
}

// ── Auth APIs ──────────────────────────────────────────────
export async function apiSignup(name, email, password) {
  const { data } = await api.post('/auth/signup', { name, email, password })
  return data.user
}

export async function apiLogin(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  return data.user
}

export async function apiGetMe() {
  const { data } = await api.get('/auth/me')
  return data.user
}

export async function apiUpdateProfile(name, email) {
  const { data } = await api.put('/auth/profile', { name, email })
  return data.user
}

export async function apiChangePassword(currentPassword, newPassword) {
  const { data } = await api.put('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return data
}

export async function apiDeleteAccount(password) {
  const { data } = await api.delete('/auth/delete-account', { data: { password } })
  return data
}

// ── User Data APIs ─────────────────────────────────────────
export async function saveUserData(dataType, dataObj) {
  const { data } = await api.post('/user/data', { data_type: dataType, data: dataObj })
  return data
}

export async function getUserData(dataType) {
  const { data } = await api.get(`/user/data/${dataType}`)
  return data
}

export async function getAllUserData() {
  const { data } = await api.get('/user/data')
  return data
}

// ── AI Generation APIs ─────────────────────────────────────
export async function aiGenerateJD(params) {
  const { data } = await api.post('/ai/generate-jd', {
    job_title: params.jobTitle,
    department: params.department,
    experience_level: params.expLevel,
    work_mode: params.workMode,
    raw_notes: params.rawNotes || '',
    tone: params.tone,
    focus_area: params.focusArea,
  })
  return data
}

export async function aiRefineJD(currentJD, instruction) {
  const { data } = await api.post('/ai/refine-jd', {
    current_jd: currentJD,
    instruction: instruction,
  })
  return data
}

export default api
