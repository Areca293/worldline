import { useQuery, useQueryClient } from '@tanstack/react-query'
import { get } from '../lib/http'
import type { Session } from './types'

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => get<Session>('auth/session/', signal),
    staleTime: 30_000,
    retry: false,
  })
}

export function useAccountChange() {
  const cache = useQueryClient()
  return async (session: Session) => {
    const privateData = {
      predicate: (query: { queryKey: readonly unknown[] }) =>
        ['articles', 'article', 'bookmarks', 'assistance-status'].includes(
          String(query.queryKey[0]),
        ),
    }
    await cache.cancelQueries(privateData)
    cache.removeQueries(privateData)
    cache.setQueryData(['session'], session)
  }
}
