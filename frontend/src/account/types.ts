export interface Session {
  user: { id: number; username: string } | null
  csrfToken: string
}
