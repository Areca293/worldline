// Keep the reader-route allowlist identical for sign-in and registration.
export function safeNextPath(value: string | null): string {
  const candidate = value || '/'
  return /^\/(?:\?|$|research(?:\?|$)|bookmarks(?:\?|$)|articles\/[a-zA-Z0-9_-]+(?:\?|$))/.test(
    candidate,
  ) && !candidate.includes('\\')
    ? candidate
    : '/'
}
