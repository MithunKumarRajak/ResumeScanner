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
export async function predictResume(resumeText, jobDescription = '') {
  const payload = { resume_text: resumeText }
  if (jobDescription && jobDescription.trim()) {
    payload.job_description = jobDescription
  }
  const { data } = await api.post('/predict', payload)
  return data
}

/**
 * Fetch all available job categories from the backend.
 */
export async function getCategories() {
  const { data } = await api.get('/categories')
  return data.categories || []
}

export default api
