export interface Allowance {
  daily_limit: number
  remaining: number
  resets: string
}
export interface Capabilities {
  web_search: boolean
  answers: boolean
  reading_help: boolean
  allowance: Allowance | null
}
export interface Evidence {
  id: number
  title: string
  url: string
  publisher: string
  text: string
  kind: string
  published_at: string | null
}
export interface AssistanceResult {
  answer: {
    paragraphs: { text: string; source_ids: number[] }[]
    limitations: string
    evidence_sufficient: boolean
  } | null
  sources: Evidence[]
  answer_status: string
  message: string
  retrieved_at: string | null
  generated_at: string | null
  cached: boolean
  allowance: Allowance
  mode?: string
  window?: string
  input_truncated?: boolean
}
