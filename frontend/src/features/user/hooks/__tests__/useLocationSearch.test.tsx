import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {geocodingApi} from '@/lib/api/geocodingApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {LOCATION_SEARCH_QUERY_KEY, type LocationSuggestion, useLocationSearch} from '@/features/user'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/geocodingApi', () => ({
    geocodingApi: {
        searchLocations: vi.fn(),
    },
    MIN_LOCATION_QUERY_LENGTH: 3,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockSuggestions: LocationSuggestion[] = [
    {
        id: '298248',
        display_name: 'New York, United States',
        latitude: 40.7127281,
        longitude: -74.0060152,
    },
    {
        id: '100722',
        display_name: 'New York, New York State, United States',
        latitude: 43.000351,
        longitude: -75.4999,
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderLocationSearch = (queryClient: QueryClient, initialQuery: string) =>
    renderHook(({query}) => useLocationSearch(query), {
        wrapper: createWrapper(queryClient),
        initialProps: {query: initialQuery},
    })

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLocationSearch', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({shouldAdvanceTime: true})
        queryClient = createQueryClient()
    })

    // ─── Debouncing ─────────────────────────────────────────────────────────────

    describe('debouncing', () => {
        it('does not search before the debounce delay elapses', () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            const {rerender} = renderLocationSearch(queryClient, '')
            rerender({query: 'New York'})
            expect(geocodingApi.searchLocations).not.toHaveBeenCalled()
        })

        it('searches once the debounce delay elapses', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledWith('New York'))
        })

        it('searches only for the final query when typing rapidly', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            // the field mounts empty, so every real search goes through the debounce
            const {rerender} = renderLocationSearch(queryClient, '')
            rerender({query: 'New'})
            rerender({query: 'New Y'})
            rerender({query: 'New York'})
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledTimes(1))
            expect(geocodingApi.searchLocations).toHaveBeenCalledWith('New York')
        })

        it('searches immediately for a query already present at mount', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, 'New York')
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledWith('New York'))
        })
    })

    // ─── Query gating ───────────────────────────────────────────────────────────

    describe('query gating', () => {
        it('does not search for a query below the minimum length', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, 'ny')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            expect(geocodingApi.searchLocations).not.toHaveBeenCalled()
        })

        it('does not search for a whitespace-only query', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, '     ')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            expect(geocodingApi.searchLocations).not.toHaveBeenCalled()
        })

        it('searches with the trimmed query', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, '  New York  ')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledWith('New York'))
        })

        it('is not enabled for a query below the minimum length', () => {
            const {result} = renderLocationSearch(queryClient, 'ny')
            expect(result.current.isFetching).toBe(false)
        })
    })

    // ─── Success state ──────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns the suggestions', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            const {result} = renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockSuggestions)
        })

        it('defaults to an empty suggestion list before any search runs', () => {
            const {result} = renderLocationSearch(queryClient, 'ny')
            expect(result.current.suggestions).toEqual([])
        })

        it('exposes suggestions as a non-nullable list', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            const {result} = renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(result.current.suggestions).toEqual(mockSuggestions))
        })

        it('caches per query — repeating a query does not refetch', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            const {rerender} = renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledTimes(1))

            rerender({query: 'Boston'})
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledTimes(2))

            rerender({query: 'New York'})
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(geocodingApi.searchLocations).toHaveBeenCalledTimes(2))
        })

        it('uses a query key scoped to the search term', async () => {
            vi.mocked(geocodingApi.searchLocations).mockResolvedValue(mockSuggestions)
            renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() =>
                expect(queryClient.getQueryData([LOCATION_SEARCH_QUERY_KEY, 'New York'])).toEqual(
                    mockSuggestions,
                ),
            )
        })
    })

    // ─── Error state ────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when the geocoding service fails', async () => {
            vi.mocked(geocodingApi.searchLocations).mockRejectedValue(new Error('Service unavailable'))
            const {result} = renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.suggestions).toEqual([])
        })

        it('does not retry — Nominatim is rate limited', async () => {
            vi.mocked(geocodingApi.searchLocations).mockRejectedValue(new Error('Too many requests'))
            const {result} = renderLocationSearch(queryClient, 'New York')
            await act(async () => {
                vi.advanceTimersByTime(400)
            })
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(geocodingApi.searchLocations).toHaveBeenCalledTimes(1)
        })
    })
})
