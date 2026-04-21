import { useQuery } from '@tanstack/react-query'
import { getCategories } from '../services/api'

/**
 * Fetches job categories from GET /categories.
 * Cached for 5 minutes; data is stable.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
