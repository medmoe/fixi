import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {jobApi} from '@/lib'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {mockWorker} from '@/features/worker/tests/mocks.ts'
import {useNearbyWorkers} from '../../hooks/useNearbyWorkers'

vi.mock('@/lib', () => ({
    jobApi: {
        getNearbyWorkers: vi.fn(),
    },
}))

describe('useNearbyWorkers', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('fetches the first page for the job', async () => {
        vi.mocked(jobApi.getNearbyWorkers).mockResolvedValue({data: [mockWorker(1)], total_count: 1, has_more: false, items_per_page: 6} as any)

        const {result} = renderHook(() => useNearbyWorkers(7, true), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(jobApi.getNearbyWorkers).toHaveBeenCalledWith(7, 0, 6)
        expect(result.current.workers).toHaveLength(1)
        expect(result.current.totalCount).toBe(1)
        expect(result.current.hasMore).toBe(false)
    })

    it('does not fetch when disabled (e.g. job without a location)', () => {
        renderHook(() => useNearbyWorkers(7, false), {wrapper: createWrapper(queryClient)})
        expect(jobApi.getNearbyWorkers).not.toHaveBeenCalled()
    })

    it('loads the next page from the running offset', async () => {
        vi.mocked(jobApi.getNearbyWorkers)
            .mockResolvedValueOnce({data: [mockWorker(1), mockWorker(2)], total_count: 3, has_more: true, items_per_page: 6} as any)
            .mockResolvedValueOnce({data: [mockWorker(3)], total_count: 3, has_more: false, items_per_page: 6} as any)

        const {result} = renderHook(() => useNearbyWorkers(7, true), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.hasMore).toBe(true))

        await act(async () => {
            await result.current.loadMore()
        })

        expect(jobApi.getNearbyWorkers).toHaveBeenLastCalledWith(7, 2, 6)
        await waitFor(() => expect(result.current.workers.map((w) => w.id)).toEqual([1, 2, 3]))
        expect(result.current.hasMore).toBe(false)
    })
})
