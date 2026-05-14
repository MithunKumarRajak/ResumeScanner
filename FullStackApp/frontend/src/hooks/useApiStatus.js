import { useQuery } from '@tanstack/react-query'
import { getApiStatus } from '../services/api'

export function useApiStatus() {
  return useQuery({
    queryKey: ['api-status'],
    queryFn: getApiStatus,
    refetchInterval: 30000,
    retry: 1,
    staleTime: 15000,
  })
}
