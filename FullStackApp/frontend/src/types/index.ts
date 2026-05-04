export interface ATSIssue {
  id: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface ATSResult {
  ats_score: number;
  issues: ATSIssue[];
  passed: boolean;
}

export interface WorkEntry {
  title: string;
  company: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  duration_months: number;
}

export interface GapEntry {
  gap_start: string;
  gap_end: string;
  gap_days: number;
}

export interface ExperienceResult {
  work_history: WorkEntry[];
  total_experience_years: number;
  career_gaps: GapEntry[];
}

export interface CandidateCompareEntry {
  resume_id: string;
  name: string;
  overall_score: number;
  ats_score: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_years: number;
}

export interface CompareResult {
  candidates: CandidateCompareEntry[];
  best_match_id: string;
  skill_union: string[];
}

export interface BulkJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_resumes: number;
  processed_count: number;
  progress_percent: number;
  results?: any[];
}
