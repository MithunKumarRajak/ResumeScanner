import axios from 'axios'

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim()
const API_BASE_URL = (
  configuredApiUrl && !configuredApiUrl.includes('your-railway-domain')
    ? configuredApiUrl
    : (import.meta.env.DEV ? '/backend-api' : 'http://127.0.0.1:8000')
)

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

import useStore from '../store'

//  Request interceptor ─
api.interceptors.request.use(
  (config) => {
    const userStr = localStorage.getItem('rs_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const token = user?.token || user?.access_token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
)

// Timestamp of the last successful login — prevents race conditions
// where stale 401s clear a freshly-saved token.
let _lastLoginAt = 0;
export function markLoginTimestamp() {
  _lastLoginAt = Date.now();
}

//  Response interceptor 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';

      // Endpoints that work without auth — never trigger the modal
      const guestEndpoints = ['/predict', '/models', '/upload-resume', '/extract-resume', '/api/ats/check'];
      const isGuestAllowed = guestEndpoints.some((ep) => requestUrl.includes(ep));

      // Auth & user-data endpoints — a 401 here is expected when not logged in;
      // don't nuke the token or flash the modal for these.
      const isAuthRelated = requestUrl.includes('/auth/') || requestUrl.includes('/user/data');

      // Grace period: if the user just logged in (< 3 s ago), don't let a
      // stale 401 from an older request wipe the new session.
      const withinGracePeriod = Date.now() - _lastLoginAt < 3000;

      if (!isGuestAllowed && !isAuthRelated && !withinGracePeriod) {
        localStorage.removeItem('rs_user');
        useStore.getState().openAuthModal();
      }
    }
    
    // Normalize error message
    const isNetworkError = !error.response
    const message = error.response?.data?.detail 
                 || error.response?.data?.message
                 || (isNetworkError ? `Cannot reach backend API at ${API_BASE_URL}. Make sure the FastAPI server is running on port 8000.` : error.message)
                 || 'An unexpected API error occurred'
    
    error.message = typeof message === 'string' ? message : JSON.stringify(message)
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

export async function rescoreResume(editedResumeText, jobDescription = '', modelVersion = '') {
  const payload = { edited_resume_text: editedResumeText }
  if (jobDescription && jobDescription.trim()) {
    payload.job_description = jobDescription
  }
  if (modelVersion && String(modelVersion).trim()) {
    payload.model_version = modelVersion
  }
  const { data } = await api.post('/api/rescore', payload)
  return data
}

/**
 * Fetch available model versions and metadata from backend.
 */
export async function getModels() {
  const { data } = await api.get('/models')
  return data || { default_model: '', models: [] }
}

export async function getApiStatus() {
  const { data } = await api.get('/api/status', { timeout: 10000 })
  return data
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
  markLoginTimestamp()
  return data.user
}

export async function apiLogin(email, password) {
  const { data } = await api.post('/auth/login', { email, password })
  markLoginTimestamp()
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

export async function apiForgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function apiResetPassword(token, newPassword) {
  const { data } = await api.post('/auth/reset-password', {
    token,
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

export async function sendNotification(candidateEmail, type, name, jobTitle, analysisId = null) {
  const { data } = await api.post('/api/notifications/send', {
    candidate_email: candidateEmail,
    notification_type: type,
    candidate_name: name,
    job_title: jobTitle,
    resume_analysis_id: analysisId
  })
  return data
}

// ────────────────────────────────────────────────────────────
//  Analytics APIs
// ────────────────────────────────────────────────────────────

export async function getSkillDemand(topN = 20) {
  const { data } = await api.get('/analytics/skill-demand', { params: { top_n: topN } })
  return data
}

export async function getSkillSupply(topN = 20) {
  const { data } = await api.get('/analytics/skill-supply', { params: { top_n: topN } })
  return data
}

export async function getMatchDistribution() {
  const { data } = await api.get('/analytics/match-distribution')
  return data
}

export async function getCategoryBreakdown() {
  const { data } = await api.get('/analytics/category-breakdown')
  return data
}

export async function getExperienceDistribution() {
  const { data } = await api.get('/analytics/experience-distribution')
  return data
}

export async function getTopCandidates(limit = 10) {
  const { data } = await api.get('/analytics/top-candidates', { params: { limit } })
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
  const { data } = await api.post('/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return data
}

//  Phase 2 APIs 

export async function checkATS(resumeId, resumeText = '') {
  const payload = {}
  if (resumeId) payload.resume_id = resumeId
  if (resumeText && resumeText.trim()) payload.resume_text = resumeText
  const { data } = await api.post('/api/ats/check', payload)
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

export async function generateCoverLetter(resumeText, jobDescription, tone = "Professional & Confident") {
  const { data } = await api.post('/ai/generate-cover-letter', {
    resume_text: resumeText,
    job_description: jobDescription,
    tone: tone
  })
  return data
}

export async function saveAnalysisReport(report) {
  const { data } = await api.post('/api/analyses', report)
  return data
}

export async function getAnalysisReports() {
  const { data } = await api.get('/api/analyses')
  return data
}

export async function getAnalysisReport(reportId) {
  const { data } = await api.get(`/api/analyses/${reportId}`)
  return data
}

export async function deleteAnalysisReport(reportId) {
  const { data } = await api.delete(`/api/analyses/${reportId}`)
  return data
}

export default api
