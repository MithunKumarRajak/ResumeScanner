import { useMutation } from '@tanstack/react-query'
import { analyzeResume } from '../services/api'
import useStore from '../store'

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
 * Hook that wraps /analyze call, extracts structured match data,
 * and saves it to the Zustand store.
 */
export function useMatch() {
  const setMatchResult  = useStore((s) => s.setMatchResult)
  const setIsAnalyzing  = useStore((s) => s.setIsAnalyzing)
  const addCandidate    = useStore((s) => s.addCandidate)
  const parsedResume    = useStore((s) => s.parsedResume)

  return useMutation({
    mutationFn: ({ resumeText, jobDescription, modelVersion, resumeId, jobId }) =>
      analyzeResume(resumeText, jobDescription, modelVersion, resumeId, jobId),

    onMutate: () => {
      setIsAnalyzing(true)
    },

    onSuccess: (data) => {
      const matching = data.matched_skills || []
      const missing = data.missing_skills || []

      const score = data.match_score !== null && data.match_score !== undefined
        ? Math.round(data.match_score)
        : null

      const result = {
        ...data,
        matchScore:      score,
        category:        data.display_prediction || data.category,
        confidence:      data.confidence,
        confidencePct:   data.confidence_pct || (data.confidence || 0) * 100,
        needsHumanReview: data.needs_human_review || false,
        reviewReason:    data.review_reason || '',
        topCategories:   data.top_recommendations || data.top_categories || [],
        applyNowReadiness: data.apply_now_readiness || null,
        resumeGaps:      data.resume_gaps || [],
        improvementTips: data.improvement_tips || [],
        roleSuggestions: data.role_suggestions || [],
        matchingSkills:  matching,
        missingSkills:   missing,
        atsScore:        data.ats_score || 0,
        suggestions:     data.suggestions || [],
        recommendation:  buildRecommendation(score, data.category, matching, missing),
        // Security pipeline fields — explicit snake_case → camelCase mapping.
        // The ...data spread above does NOT propagate these because MatchResultCard
        // destructures by name; without explicit mapping they silently become undefined.
        scanPassed:         data.scan_passed ?? null,
        scanReason:         data.scan_reason ?? null,
        piiRedactionCount:  data.pii_redaction_count ?? null,
        piiTypesFound:      data.pii_types_found ?? [],
        // Model version — used by ReportSummary to display which model scored the resume.
        modelVersion:       data.model_version ?? null,
      }

      setMatchResult(result)

      // Push to recruiter candidate list
      const candidate = {
        id: Date.now(),
        name: parsedResume?.name || 'Unknown Candidate',
        category:    data.category,
        matchScore:  score ?? 0,
        skills:      matching,
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
