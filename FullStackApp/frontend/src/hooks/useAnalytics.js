import { useQuery } from '@tanstack/react-query'
import {
  getSkillDemand,
  getSkillSupply,
  getMatchDistribution,
  getCategoryBreakdown,
  getExperienceDistribution,
  getTopCandidates
} from '../services/api'

export function useSkillDemand(topN = 20) {
  return useQuery({
    queryKey: ['analytics', 'skillDemand', topN],
    queryFn: () => getSkillDemand(topN),
    staleTime: 5 * 60 * 1000,
  })
}

export function useSkillSupply(topN = 20) {
  return useQuery({
    queryKey: ['analytics', 'skillSupply', topN],
    queryFn: () => getSkillSupply(topN),
    staleTime: 5 * 60 * 1000,
  })
}

export function useMatchDistribution() {
  return useQuery({
    queryKey: ['analytics', 'matchDistribution'],
    queryFn: getMatchDistribution,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ['analytics', 'categoryBreakdown'],
    queryFn: getCategoryBreakdown,
    staleTime: 5 * 60 * 1000,
  })
}

export function useExperienceDistribution() {
  return useQuery({
    queryKey: ['analytics', 'experienceDistribution'],
    queryFn: getExperienceDistribution,
    staleTime: 5 * 60 * 1000,
  })
}

export function useTopCandidates(limit = 10) {
  return useQuery({
    queryKey: ['analytics', 'topCandidates', limit],
    queryFn: () => getTopCandidates(limit),
    staleTime: 60 * 1000, // Top candidates might change more often
  })
}
