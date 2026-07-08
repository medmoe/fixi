
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {useAvailabilityToggle} from '../useAvailabilityToggle'
import {workerApi} from '@/lib/api/workerApi'
import {toast} from 'sonner'
import type {ReactNode} from 'react'
import type {WorkerProfile} from '../../types/worker.types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        toggleAvailability: vi.fn(),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
    },
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORKER_ID = 1

const mockProfile: WorkerProfile = {
    id: WORKER_ID,
    user: {
        id: 42,
        name: 'John Doe',
        username: 'johndoe',
        email: 'johndoe@example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        role_type: 'worker',
    },
    bio: 'Experienced plumber',
    hourly_rate: 75.00,
    service_radius_km: 20,
    is_available: false,
    is_verified: true,
    available_since: null,
    trades: [],
}

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    })


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

            // check cache immediately — before API resolves
            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(true)  // ✅ optimistic update applied
        })

        it('flips is_available from false to true optimistically', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: true,
                available_since: '2026-01-01T00:00:00Z',
            })

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

            const cached = queryClient.getQueryData<WorkerProfile>(['workerProfile', WORKER_ID])
            expect(cached?.is_available).toBe(true)
        })

        it('flips is_available from true to false optimistically', async () => {
            vi.mocked(workerApi.toggleAvailability).mockResolvedValue({
                is_available: false,
                available_since: null,
            })

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
                result.current.mutate(true)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.error).not.toHaveBeenCalled()
        })

        it('does updated available_since on success', async () => {
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
            expect(result.current.data?.available_since).toBe('2026-01-01T00:00:00Z')
            expect(result.current.data?.is_available).toBe(true)
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
                result.current.mutate(false)
            })
            expect(result.current.data?.available_since).toBe(null)
            expect(result.current.data?.is_available).toBe(false)
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