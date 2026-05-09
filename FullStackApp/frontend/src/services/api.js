import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

//  Request interceptor ─
api.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => Promise.reject(error)
)

//  Response interceptor 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rs_user')
    }
    return Promise.reject(error)
  }
)

//  Typed helpers 

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
  return data || { default_model: '', models: [] }
}

/**
 * Fetch all available job categories from the backend.
 */
export async function getCategories() {
  const { data } = await api.get('/categories')
  return data.categories || []
}

//  Auth APIs 
export async function apiSignup(name, email, password, role = 'candidate') {
  const { data } = await api.post('/auth/signup', { name, email, password, role })
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

export async function apiLogout() {
  const { data } = await api.post('/auth/logout')
  return data
}

//  User Data APIs ─
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

//  AI Generation APIs 
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

export async function aiExplainMatch(resumeText, jobDescription, matchScore) {
  const { data } = await api.post('/ai/explain-match', {
    resume_text: resumeText,
    job_description: jobDescription,
    match_score: matchScore,
  })
  return data
}

//  Resume Extraction API (PyMuPDF backend) 
export async function extractResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/extract-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  })
  return data
}

//  Resume upload API (creates a backend resume record and returns resume_id)
export async function uploadResume(file) {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post('/api/resume/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return data
}

//  Phase 2 APIs 

export async function checkATS(resumeId) {
  const { data } = await api.post('/api/ats/check', { resume_id: resumeId })
  return data
}

export async function extractExperience(resumeId) {
  const { data } = await api.post('/api/experience/extract', { resume_id: resumeId })
  return data
}

export async function compareCandidates(resumeIds, jobDescId = null) {
  const payload = { resume_ids: resumeIds }
  if (jobDescId) payload.job_description_id = jobDescId
  const { data } = await api.post('/api/compare/candidates', payload)
  return data
}

export async function bulkUpload(files, jobDescId = null) {
  const formData = new FormData()
  files.forEach(f => formData.append('files', f))
  if (jobDescId) formData.append('job_description_id', jobDescId)

  const { data } = await api.post('/api/bulk/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return data
}

export async function getBulkStatus(jobId) {
  const { data } = await api.get(`/api/bulk/${jobId}/status`)
  return data
}

export async function sendNotification(params) {
  const { data } = await api.post('/api/notifications/send', params)
  return data
}

export default api
