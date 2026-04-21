import { useMutation } from '@tanstack/react-query'
import { predictResume } from '../services/api'
import useStore from '../store'

/**
 * Derives matching & missing skills by comparing
 * resume_top_terms vs jd_top_terms returned from /predict.
 */
function deriveSkillSets(resumeTerms = [], jdTerms = []) {
  const resumeSet = new Set(resumeTerms.map((t) => t.toLowerCase()))
  const jdSet     = new Set(jdTerms.map((t) => t.toLowerCase()))

  const matching = [...resumeSet].filter((t) => jdSet.has(t))
  const missing  = [...jdSet].filter((t) => !resumeSet.has(t))
  return { matching, missing }
}

/**
 * Generates a human-readable recommendation based on match score.
 */
function buildRecommendation(score, category, matching, missing) {
  if (score === null || score === undefined) {
    return `Your resume matches the "${category}" category. Provide a job description to get a match score.`
  }
  if (score >= 70) {
    return `Excellent match! Your resume strongly aligns with this role (${score}%). Focus on ${missing.slice(0, 2).join(', ') || 'polishing your presentation'} to stand out further.`
  }
  if (score >= 40) {
    return `Moderate match (${score}%). You share ${matching.length} key terms with the role. Adding more experience around ${missing.slice(0, 3).join(', ')} will significantly improve your score.`
  }
  return `Low match (${score}%). Consider tailoring your resume for this role. Key missing areas: ${missing.slice(0, 4).join(', ') || 'various required skills'}.`
}

/**
 * Hook that wraps /predict call, extracts structured match data,
 * and saves it to the Zustand store.
 */
export function useMatch() {
  const setMatchResult  = useStore((s) => s.setMatchResult)
  const setIsAnalyzing  = useStore((s) => s.setIsAnalyzing)
  const addCandidate    = useStore((s) => s.addCandidate)
  const parsedResume    = useStore((s) => s.parsedResume)

  return useMutation({
    mutationFn: ({ resumeText, jobDescription }) =>
      predictResume(resumeText, jobDescription),

    onMutate: () => {
      setIsAnalyzing(true)
    },

    onSuccess: (data) => {
      const { matching, missing } = deriveSkillSets(
        data.resume_top_terms,
        data.jd_top_terms
      )

      const score = data.match_score !== null && data.match_score !== undefined
        ? Math.round(data.match_score)
        : null

      const result = {
        matchScore:      score,
        category:        data.predicted_category,
        confidence:      data.confidence,
        matchingSkills:  matching,
        missingSkills:   missing,
        resumeTopTerms:  data.resume_top_terms || [],
        jdTopTerms:      data.jd_top_terms || [],
        recommendation:  buildRecommendation(score, data.predicted_category, matching, missing),
      }

      setMatchResult(result)

      // Push to recruiter candidate list
      const candidate = {
        id: Date.now(),
        name: parsedResume?.name || 'Unknown Candidate',
        category:    data.predicted_category,
        matchScore:  score ?? 0,
        skills:      data.resume_top_terms || [],
        experience:  parsedResume?.experience || 0,
        timestamp:   new Date().toISOString(),
      }
      addCandidate(candidate)

      setIsAnalyzing(false)
    },

    onError: () => {
      setIsAnalyzing(false)
    },
  })
}
