import { useResumeStore } from '../store/useResumeStore';
import type { ResumeData } from '../types/resume';

// Shared field updater
export function useDataUpdater() {
  const { updateData, getActiveResume } = useResumeStore();
  const resume = getActiveResume();
  const data = resume?.data;

  const set = (partial: Partial<ResumeData>) => updateData(partial);

  return { data, set };
}
