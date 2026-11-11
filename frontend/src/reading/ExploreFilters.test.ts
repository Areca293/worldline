import { expect, it } from 'vitest'
import { readExplore } from './ExploreFilters'

it.each([
  ['', 'stories', ''],
  ['sort=stars', 'projects', 'stars'],
  ['sort=growth', 'projects', 'growth'],
  ['type=projects', 'projects', 'stars'],
  ['type=stories&sort=growth', 'stories', ''],
  ['type=projects&sort=invalid', 'projects', 'stars'],
])('restores Explore state from %s', (query, type, sort) => {
  expect(readExplore(new URLSearchParams(query))).toEqual({ type, sort })
})
