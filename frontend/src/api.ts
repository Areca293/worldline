export interface Topic {
  name: string
  slug: string
}
export interface Article {
  id: number
  slug: string
  title: string
  topic: Topic
  source: { name: string; website_url: string }
  summary: string
  original_url: string
  is_bookmarked: boolean
  source_updated_at: string | null
  published_at: string | null
  collected_at: string
  is_sample: boolean
  featured: boolean
  repository?: {
    full_name: string
    stars: number
    license: string
    observed_at: string
    pushed_at: string | null
    baseline_at: string | null
    star_change: number | null
    is_stale: boolean
  } | null
}
export interface ArticlePage {
  approximate_search?: boolean
  page: number
  page_size: number | null
  total_pages: number
  count: number
  results: Article[]
  next: string | null
}
export interface Health {
  status: string
  database: string
  stage: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public details?: Record<string, string | string[]>,
  ) {
    super('Unable to load content.')
  }
}

export async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    headers: { Accept: 'application/json' },
    signal,
    credentials: 'same-origin',
  })
  if (!response.ok) throw new ApiError(response.status)
  return response.json() as Promise<T>
}

export function publishedLabel(date: string | null): string {
  if (!date) return 'Publication date unavailable'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
}

export function safeExternalUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
      ? parsed.href
      : undefined
  } catch {
    return undefined
  }
}

export interface Session {
  user: { id: number; username: string } | null
  csrfToken: string
}

// Fetch a current token before writes, including anonymous login. Login rotates it.
export async function write<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const session = await get<Session>('auth/session/')
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': session.csrfToken,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const details = await response.json().catch(() => undefined)
    throw new ApiError(response.status, details)
  }
  return response.json() as Promise<T>
}

export function timestampLabel(date: string): string {
  return (
    new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(date)) + ' UTC'
  )
}
