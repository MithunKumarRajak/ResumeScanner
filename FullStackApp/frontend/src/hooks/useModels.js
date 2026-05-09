import { useQuery } from '@tanstack/react-query'
import { getModels } from '../services/api'

/**
 * Fetches available ML models from GET /models.
 * Cached for 5 minutes.
 */
export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: getModels,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
