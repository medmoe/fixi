import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useAnalyticsDashboard} from '../useAnalyticsDashboard'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        getAnalyticsOverview: vi.fn(),
        getAnalyticsBreakdown: vi.fn(),
        getAnalyticsFunnel: vi.fn(),
    },
}))

const mockOverview = {jobs_posted: 1, applications_submitted: 1, applications_accepted: 0, jobs_completed: 0, acceptance_rate: 0, completion_rate: 0, daily: []}
const mockBreakdown = {by_trade_category: [], by_location: []}
const mockFunnel = {posted: 1, applied: 0, accepted: 0, completed: 0}

describe('useAnalyticsDashboard', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
        vi.mocked(adminApi.getAnalyticsOverview).mockResolvedValue(mockOverview)
        vi.mocked(adminApi.getAnalyticsBreakdown).mockResolvedValue(mockBreakdown)
        vi.mocked(adminApi.getAnalyticsFunnel).mockResolvedValue(mockFunnel)
    })

    it('fetches overview, breakdown, and funnel with the current filters', async () => {
        const {result} = renderHook(() => useAnalyticsDashboard(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))

        expect(result.current.overview).toEqual(mockOverview)
        expect(result.current.breakdown).toEqual(mockBreakdown)
        expect(result.current.funnel).toEqual(mockFunnel)
        expect(adminApi.getAnalyticsOverview).toHaveBeenCalledWith({})
        expect(adminApi.getAnalyticsBreakdown).toHaveBeenCalledWith({})
        expect(adminApi.getAnalyticsFunnel).toHaveBeenCalledWith({})
    })

    it('refetches all three queries when filters change', async () => {
        const {result} = renderHook(() => useAnalyticsDashboard(), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        act(() => result.current.updateFilters({date_from: '2026-01-01T00:00:00Z'}))

        await waitFor(() => expect(adminApi.getAnalyticsOverview).toHaveBeenCalledWith({date_from: '2026-01-01T00:00:00Z'}))
        expect(adminApi.getAnalyticsBreakdown).toHaveBeenCalledWith({date_from: '2026-01-01T00:00:00Z'})
        expect(adminApi.getAnalyticsFunnel).toHaveBeenCalledWith({date_from: '2026-01-01T00:00:00Z'})
    })

    it('exposes isError when any query fails', async () => {
        vi.mocked(adminApi.getAnalyticsFunnel).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useAnalyticsDashboard(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isError).toBe(true))
    })
})
