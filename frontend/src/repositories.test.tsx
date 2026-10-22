import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Article } from './api'
import { RepositoryStats } from './repositories'

it.each([
  [null, false, 'Growth: collecting a full day of observations.'],
  [0, false, '0 stars over 24.0h'],
  [-5, false, '-5 stars over 24.0h'],
  [30, true, 'Snapshot outdated. Growth unavailable.'],
] as const)(
  'distinguishes missing, zero, negative and stale growth (%s, %s)',
  (change, stale, expected) => {
    const article = {
      repository: {
        full_name: 'fixture/project',
        stars: 100,
        license: 'MIT',
        observed_at: '2026-10-22T12:00:00Z',
        baseline_at: change === null ? null : '2026-10-21T12:00:00Z',
        pushed_at: null,
        star_change: change,
        is_stale: stale,
      },
    } as Article
    render(<RepositoryStats article={article} detailed />)
    expect(screen.getByText(expected)).toBeVisible()
    expect(screen.getByText('100 GitHub stars')).toBeVisible()
  },
)
