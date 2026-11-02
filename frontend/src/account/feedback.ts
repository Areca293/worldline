import { ApiError } from '../lib/http'

export function failure(error: Error) {
  if (error instanceof ApiError && error.status === 403)
    return 'Your session has changed. Reload the page and sign in again.'
  if (error instanceof ApiError && error.status === 429)
    return 'Too many sign-in attempts. Please wait a minute and try again.'
  if (error instanceof ApiError && error.status === 400)
    return 'Invalid username or password.'
  return 'We couldn’t complete your request. Please try again.'
}
