import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {workerApi} from '@/lib/api/workerApi.ts'
import {createQueryClient, createWrapper, mockProfile} from "../helpers.tsx";
import {useWorkerProfile, useWorkerProfilePublic, WorkerProfileWithTradesRead} from '@/features/worker'


// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        getWorkerProfile: vi.fn(),
        getWorkerProfilePublic: vi.fn()
    }
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useWorkerProfile', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Query execution ────────────────────────────────────────────────────────────────────

    describe('query execution', () => {
        it('calls getWorkerProfile', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(workerApi.getWorkerProfile).toHaveBeenCalledWith())
        })
        it('calls getWorkerProfile exactly once on mount', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(workerApi.getWorkerProfile).toHaveBeenCalledTimes(1))
        })
        it('uses correct query key', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(queryClient.getQueryData(['workerProfile'])).toEqual(mockProfile))
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────────────────
    describe('loading state', () => {
        it('is loading initially when fetching', () => {
            vi.mocked(workerApi.getWorkerProfile).mockImplementation(() => new Promise(() => {
            })) // never resolves
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            expect(result.current.isLoading).toBe(true)
            expect(result.current.data).toBeUndefined()
        })
        it('is not loading after successful fetch', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            expect(result.current.isSuccess).toBe(true)
        })
        it('is not loading after failed fetch', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockRejectedValue(new Error('API error'))
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            expect(result.current.isError).toBe(true)
        })
    })
    // ─── Success state ────────────────────────────────────────────────────────────────────
    describe('success state', () => {
        it('returns worker profile data on success', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockProfile)
        })
        it('returns correct profile fields', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockProfile)
        })
        it('returns profile with trades', async () => {
            const profileWithTrades: WorkerProfileWithTradesRead = {
                ...mockProfile,
                trade_categories: [{
                    trade_category_id: 1,
                    skill_level: 'senior',
                    worker_profile_id: 1,
                    id: 1,
                    trade_category: {
                        id: 1,
                        name: 'test trade',
                        display_name: 'test trade',
                        created_at: '2026-01-01',
                        icon_name: 'bolt',
                        parent_id: null
                    }
                }]
            }
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(profileWithTrades)
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.trade_categories).toHaveLength(1)
            expect(result.current.data?.trade_categories[0].skill_level).toBe('senior')
        })
        it('caches result — does not refetch when hook remounts', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile)
            const {unmount} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() => expect(queryClient.getQueryData(['workerProfile',])).toEqual(mockProfile))
            unmount()
            // remount — should use cache
            renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            // still only called once
            await waitFor(() => expect(workerApi.getWorkerProfile).toHaveBeenCalledTimes(1))
        })
    })
    // ─── Error state ────────────────────────────────────────────────────────────────────
    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('exposes the error object', async () => {
            const error = new Error('Not found')
            vi.mocked(workerApi.getWorkerProfile).mockRejectedValue(error)
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
        it('does not cache error state', async () => {
            vi.mocked(workerApi.getWorkerProfile).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(queryClient.getQueryData(['workerProfile',])).toBeUndefined()
        })
    })
    // ─── Refetch behavior ────────────────────────────────────────────────────────────────────
    describe('refetch behavior ', () => {
        it('refetches and updates data on manual refetch', async () => {
            const updatedProfile = {...mockProfile, bio: 'Updated bio'}
            vi.mocked(workerApi.getWorkerProfile)
                .mockResolvedValueOnce(mockProfile) // first fetch
                .mockResolvedValueOnce(updatedProfile) // refresh

            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.bio).toEqual(mockProfile.bio)
            await result.current.refetch()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.bio).toEqual(updatedProfile.bio)
        })
        it('reflects updated availability after refetch', async () => {
            vi.mocked(workerApi.getWorkerProfile)
                .mockResolvedValueOnce({...mockProfile, is_available: false})
                .mockResolvedValueOnce({...mockProfile, is_available: true})

            const {result} = renderHook(
                () => useWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.is_available).toBe(false)
            await result.current.refetch()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.is_available).toBe(true)
        })
    })
})

describe('useWorkerProfilePublic', () => {
    let queryClient: QueryClient
    const workerId = 123

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Query execution ──────────────────────────────────────────────────────

    describe('query execution', () => {
        it('calls getWorkerProfilePublic with the worker ID', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic).mockResolvedValue(mockProfile)

            renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(workerApi.getWorkerProfilePublic)
                    .toHaveBeenCalledWith(workerId)
            )
        })

        it('calls getWorkerProfilePublic exactly once on mount', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic).mockResolvedValue(mockProfile)

            renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(workerApi.getWorkerProfilePublic)
                    .toHaveBeenCalledTimes(1)
            )
        })

        it('uses the correct query key', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic).mockResolvedValue(mockProfile)

            renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(
                    queryClient.getQueryData(['worker-profile', workerId])
                ).toEqual(mockProfile)
            )
        })
    })

    // ─── Enabled / disabled behavior ─────────────────────────────────────────

    describe('enabled behavior', () => {
        it('fetches when worker ID is provided', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic).mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(workerApi.getWorkerProfilePublic)
                .toHaveBeenCalledWith(workerId)
        })

        it('does not fetch when worker ID is 0', async () => {
            const {result} = renderHook(
                () => useWorkerProfilePublic(0),
                {wrapper: createWrapper(queryClient)}
            )

            // Query is disabled, so API should never be called
            expect(workerApi.getWorkerProfilePublic)
                .not.toHaveBeenCalled()

            expect(result.current.isPending).toBe(true)
            expect(result.current.fetchStatus).toBe('idle')
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when fetching', () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockImplementation(() => new Promise(() => {
                }))

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            expect(result.current.isLoading).toBe(true)
            expect(result.current.data).toBeUndefined()
        })

        it('is not loading after successful fetch', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isLoading).toBe(false)
            )

            expect(result.current.isSuccess).toBe(true)
        })

        it('is not loading after failed fetch', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockRejectedValue(new Error('API error'))

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isLoading).toBe(false)
            )

            expect(result.current.isError).toBe(true)
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns worker profile data on success', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(result.current.data).toEqual(mockProfile)
        })

        it('returns correct profile fields', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(result.current.data?.bio).toEqual(mockProfile.bio)
            expect(result.current.data?.hourly_rate)
                .toEqual(mockProfile.hourly_rate)
            expect(result.current.data?.is_available)
                .toEqual(mockProfile.is_available)
        })

        it('caches the result under the worker-specific query key', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(
                queryClient.getQueryData([
                    'worker-profile',
                    workerId
                ])
            ).toEqual(mockProfile)
        })

        it('does not use another worker profile cache entry', async () => {
            const otherWorkerId = 456
            const otherProfile = {
                ...mockProfile,
                bio: 'Other worker bio'
            }

            queryClient.setQueryData(
                ['worker-profile', otherWorkerId],
                otherProfile
            )

            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(result.current.data).toEqual(mockProfile)

            expect(
                queryClient.getQueryData([
                    'worker-profile',
                    otherWorkerId
                ])
            ).toEqual(otherProfile)
        })

        it('caches result and does not refetch when hook remounts', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {unmount} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(
                    queryClient.getQueryData([
                        'worker-profile',
                        workerId
                    ])
                ).toEqual(mockProfile)
            )

            unmount()

            renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(workerApi.getWorkerProfilePublic)
                    .toHaveBeenCalledTimes(1)
            )
        })
    })

    // ─── Error state ──────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockRejectedValue(new Error('API call failed'))

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isError).toBe(true)
            )

            expect(result.current.data).toBeUndefined()
        })

        it('exposes the error object', async () => {
            const error = new Error('Worker profile not found')

            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockRejectedValue(error)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isError).toBe(true)
            )

            expect(result.current.error).toBe(error)
        })

        it('does not cache error state', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockRejectedValue(new Error('API call failed'))

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isError).toBe(true)
            )

            expect(
                queryClient.getQueryData([
                    'worker-profile',
                    workerId
                ])
            ).toBeUndefined()
        })
    })

    // ─── Refetch behavior ────────────────────────────────────────────────────

    describe('refetch behavior', () => {
        it('refetches and updates data on manual refetch', async () => {
            const updatedProfile = {
                ...mockProfile,
                bio: 'Updated public bio'
            }

            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValueOnce(mockProfile)
                .mockResolvedValueOnce(updatedProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            expect(result.current.data?.bio)
                .toEqual(mockProfile.bio)

            await result.current.refetch()

            await waitFor(() =>
                expect(result.current.data?.bio)
                    .toEqual(updatedProfile.bio)
            )

            expect(workerApi.getWorkerProfilePublic)
                .toHaveBeenCalledTimes(2)
        })

        it('passes the correct worker ID on refetch', async () => {
            vi.mocked(workerApi.getWorkerProfilePublic)
                .mockResolvedValue(mockProfile)

            const {result} = renderHook(
                () => useWorkerProfilePublic(workerId),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() =>
                expect(result.current.isSuccess).toBe(true)
            )

            await result.current.refetch()

            expect(workerApi.getWorkerProfilePublic)
                .toHaveBeenCalledTimes(2)

            expect(workerApi.getWorkerProfilePublic)
                .toHaveBeenNthCalledWith(1, workerId)

            expect(workerApi.getWorkerProfilePublic)
                .toHaveBeenNthCalledWith(2, workerId)
        })
    })
})