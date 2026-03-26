import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'

import { queryClient } from './query-client'

describe('query-client', () => {
  it('exports a QueryClient instance', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
  })

  it('configures expected default query options', () => {
    const defaults = queryClient.getDefaultOptions().queries
    expect(defaults?.staleTime).toBe(60_000)
    expect(defaults?.retry).toBe(1)
    expect(defaults?.refetchOnWindowFocus).toBe(false)
  })

  it('keeps mutation defaults untouched', () => {
    expect(queryClient.getDefaultOptions().mutations).toBeUndefined()
  })
})
