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
  published_at: string | null
  collected_at: string
  is_sample: boolean
  featured: boolean
}
export interface ArticlePage {
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
  constructor(public status: number) {
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
