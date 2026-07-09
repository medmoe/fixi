import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useAvailabilityToggle} from '@/features/worker/hooks/useAvailabilityToggle'
import {workerApi} from '@/lib/api/workerApi'
import {toast} from 'sonner'
import type {WorkerProfile} from '@/features/worker/types/worker.types'
import {createQueryClient, createWrapper, mockProfile, WORKER_ID} from './helpers'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        toggleAvailability: vi.fn(),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    },
}))


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAvailabilityToggle', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = createQueryClient()
        vi.clearAllMocks()

        // seed the cache with a profile before each test
        queryClient.setQueryData<WorkerProfile>(
            ['workerProfile', WORKER_ID],
            mockProfile,
        )
    })

    // ─── Optimistic Update ──────────────────────────────────────────────────────

    describe('optimistic update', () => {
        it('immediately updates cache before API responds', async () => {
            vi.mocked(workerApi.toggleAvailability).mockImplementation(
                () => new Promise((resolve) =>
                    setTimeout(() => resolve({is_available: true, available_since: '2026-01-01T00:00:00Z'}), 100)
                )
            )

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            // ✅ wait for isPending to be true — means onMutate has completed
            await waitFor(() => expect(result.current.isPending).toBe(true))

            // now check cache — optimistic update should be applied
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(true)
        })

        it('flips is_available from false to true optimistically', async () => {
            vi.mocked(workerApi.toggleAvailability).mockImplementation(
                () => new Promise((resolve) =>
                    setTimeout(() => resolve({is_available: true, available_since: '2026-01-01T00:00:00Z'}), 100)
                )
            )

            // start offline
            queryClient.setQueryData<WorkerProfile>(['workerProfile', WORKER_ID], {
                ...mockProfile,
                is_available: false,
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(true)
        })

        it('flips is_available from true to false optimistically', async () => {
            vi.mocked(workerApi.toggleAvailability).mockImplementation(
                () => new Promise((resolve) =>
                    setTimeout(() => resolve({is_available: true, available_since: '2026-01-01T00:00:00Z'}), 100)
                )
            )

            // start online
            queryClient.setQueryData<WorkerProfile>(['workerProfile', WORKER_ID], {
                ...mockProfile,
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(false)
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(false)
        })

        it('preserves other profile fields during optimistic update', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.bio).toBe(mockProfile.bio)
            expect(cached?.hourly_rate).toBe(mockProfile.hourly_rate)
            expect(cached?.service_radius_km).toBe(mockProfile.service_radius_km)
        })

        it('does nothing optimistically when profile is not in cache', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            // clear the cache
            queryClient.removeQueries({queryKey: ['workerProfile', WORKER_ID]})

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            // cache should still be empty — no crash
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached).toBeUndefined()
        })
    })

    // ─── Success ────────────────────────────────────────────────────────────────

    describe('on success', () => {
        it('calls toggleAvailability API with correct arguments', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            expect(workerApi.toggleAvailability).toHaveBeenCalledWith(WORKER_ID, true)
            expect(workerApi.toggleAvailability).toHaveBeenCalledTimes(1)
        })

        it('invalidates workerProfile query after success', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => {
                expect(invalidateQueriesSpy).toHaveBeenCalledWith({
                    queryKey: ['workerProfile', WORKER_ID],
                })
            })
        })

        it('does not show error toast on success', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                await result.current.mutateAsync(true)
            })

            // ✅ wait for React to process all state updates
            await waitFor(() => {
                expect(toast.success).toHaveBeenCalled()  // confirm success path ran
            })

            expect(toast.error).not.toHaveBeenCalled()
        })

        it('does update available_since when toggling on', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                await result.current.mutateAsync(true)
            })

            await waitFor(() => expect(toast.success).toHaveBeenCalled())

            // ✅ check query cache — not result.current.data
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(true)
            expect(cached?.available_since).toBe('2026-01-01T00:00:00Z')
        })

        it('does update available_since to null when flipping is_available to false', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: false,
                available_since: null,
            })
            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )
            await act(async () => {
                await result.current.mutateAsync(false)
            })
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(false)
            expect(cached?.available_since).toBe(null)
        })
    })

    // ─── Error + Rollback ───────────────────────────────────────────────────────

    describe('on error', () => {
        it('reverts cache to previous value on API failure', async () => {
            vi.mocked(workerApi.toggleAvailability).mockRejectedValue(
                new Error('Network error'),
            )

            // start offline
            queryClient.setQueryData<WorkerProfile>(['workerProfile', WORKER_ID], {
                ...mockProfile,
                is_available: false,
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            // cache should be reverted to false
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(false)  // ✅ rolled back
        })

        it('shows error toast on API failure', async () => {
            vi.mocked(workerApi.toggleAvailability).mockRejectedValue(
                new Error('Network error'),
            )

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            expect(toast.error).toHaveBeenCalledWith(
                'Status update failed',
                expect.objectContaining({
                    description: expect.stringContaining('Failed to update availability'),
                }),
            )
        })

        it('invalidates query even after error', async () => {
            vi.mocked(workerApi.toggleAvailability).mockRejectedValue(
                new Error('Network error'),
            )

            const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            // onSettled fires on both success and error
            expect(invalidateQueriesSpy).toHaveBeenCalledWith({
                queryKey: ['workerProfile', WORKER_ID],
            })
        })

        it('does not revert if no previous profile in context', async () => {
            vi.mocked(workerApi.toggleAvailability).mockRejectedValue(
                new Error('Network error'),
            )

            // clear cache before mutation
            queryClient.removeQueries({queryKey: ['workerProfile', WORKER_ID]})

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            // should not throw even with no previous profile
            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))

            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached).toBeUndefined()  // still undefined, no crash ✅
        })
    })

    // ─── Cancellation ───────────────────────────────────────────────────────────

    describe('query cancellation', () => {
        it('cancels outgoing workerProfile queries before mutating', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries')

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            await waitFor(() => {
                expect(cancelQueriesSpy).toHaveBeenCalledWith({
                    queryKey: ['workerProfile', WORKER_ID],
                })
            })
        })
    })

    // ─── Mutation State ─────────────────────────────────────────────────────────

    describe('mutation state', () => {
        it('is idle initially', () => {
            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )
            expect(result.current.isPending).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)
        })

        it('is pending during API call', async () => {
            // never resolves — keeps mutation in pending state
            vi.mocked(workerApi.toggleAvailability).mockImplementation(
                () => new Promise(() => {
                }),
            )

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
        })

        it('is success after successful API call', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
        })

        it('is error after failed API call', async () => {
            vi.mocked(workerApi.toggleAvailability).mockRejectedValue(
                new Error('Network error'),
            )

            const {result} = renderHook(
                () => useAvailabilityToggle(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
        })
    })
})