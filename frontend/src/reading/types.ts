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
  image_url?: string
  image_credit?: string
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
