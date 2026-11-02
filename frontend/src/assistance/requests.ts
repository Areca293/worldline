import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../account/session'
import { ApiError, get } from '../lib/http'
import type { Capabilities, AssistanceResult } from './types'

export function useCapabilities() {
  const session = useSession()
  return useQuery({
    queryKey: ['assistance-status', session.data?.user?.id ?? null],
    queryFn: ({ signal }) => get<Capabilities>('ai/status/', signal),
    retry: false,
  })
}

export function errorMessage(error: Error) {
  if (error instanceof ApiError) {
    if (error.status === 403)
      return 'Your session has changed. Reload and sign in again.'
    const detail = error.details?.detail
    if (typeof detail === 'string') return detail
    if (error.status === 429)
      return 'The request limit has been reached. Please try later.'
    if (error.status === 400) return 'Check the request and try again.'
  }
  return 'The request could not be completed. Check your connection and try again.'
}

// Explicit mutations only; refresh allowance after success and failure alike.
export function useAssistanceRequest<Input>(
  request: (input: Input) => Promise<AssistanceResult>,
) {
  const cache = useQueryClient()
  return useMutation({
    mutationKey: ['assistance'],
    mutationFn: request,
    retry: false,
    gcTime: 0,
    onSettled: () =>
      cache.invalidateQueries({ queryKey: ['assistance-status'] }),
  })
}
