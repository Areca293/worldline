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

// Fetch a current token before writes, including anonymous login. Login rotates it.
export async function write<T>(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const session = await get<{ csrfToken: string }>('auth/session/')
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
