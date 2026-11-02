import { expect, it } from 'vitest'
import { safeNextPath } from './redirect'

it.each([
  '/',
  '/?topic=music&page_size=all',
  '/research',
  '/research?window=week',
  '/bookmarks?q=music',
  '/articles/story_1-2?q=one',
  '/research?next=https://example.com',
])('preserves the existing reader destination %s', (path) => {
  expect(safeNextPath(path)).toBe(path)
})

it.each([
  null,
  '',
  'https://example.com',
  '//example.com',
  '/admin/',
  '/login',
  '/research/extra',
  '/bookmarks#private',
  '/articles/',
  '/articles/a/b',
  '/articles/story#section',
  '/%2Fexample.com',
  '/research?x=\\evil',
])('rejects unsupported destinations including %s', (path) => {
  expect(safeNextPath(path)).toBe('/')
})
