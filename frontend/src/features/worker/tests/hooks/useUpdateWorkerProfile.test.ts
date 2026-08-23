import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from "@testing-library/react";
import {QueryClient} from "@tanstack/react-query";
import {workerApi} from "@/lib/api/workerApi.ts";
import {useUpdateWorkerProfile, WorkerProfileWithTradesRead} from "@/features/worker";
import {createQueryClient, createWrapper, mockProfile} from "../helpers.tsx";
import {toast} from "sonner";


// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi.ts', () => ({
    workerApi: {
        updateWorkerProfile: vi.fn()
    }
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn()
    }
}))

const {trade_categories, ...workerProfileRead} = mockProfile;

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUpdateWorkerProfile', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createQueryClient();
        vi.clearAllMocks();

        // seed the cache with a profile before each test
        queryClient.setQueryData(['workerProfile',], mockProfile);
    })

    // ─── API call ──────────────────────────────────────────────────────
    describe('API call', () => {
        it('calls updateWorkerProfile with correct payload', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...workerProfileRead, bio: 'updated bio'})
            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)}
            )
            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })
            expect(workerApi.updateWorkerProfile).toHaveBeenCalledWith({bio: 'Updated bio'})
            expect(workerApi.updateWorkerProfile).toHaveBeenCalledTimes(1)
        })
        it('calls updateWorkerProfile with partial payload', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...workerProfileRead, hourly_rate: "90"})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({hourly_rate: 90})
            })

            expect(workerApi.updateWorkerProfile).toHaveBeenCalledWith({hourly_rate: 90})
        })
    })

    // ─── Success ───────────────────────────────────────────────────────────────

    describe('on success', () => {
        it('shows success toast', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...workerProfileRead})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Profile updated successfully')
        })
        it('updates the cache', async () => {
            const existingProfile: WorkerProfileWithTradesRead = {
                ...mockProfile,
                bio: 'Old bio',
                trade_categories: [
                    {id: 1, skill_level: "junior", worker_profile_id: mockProfile.id, trade_category_id: 10, trade_category: null}
                ]
            }
            // seed the cache
            queryClient.setQueryData(['workerProfile'], existingProfile);
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...workerProfileRead, bio: 'New bio'});
            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            );
            await act(async () => result.current.mutate({hourly_rate: 100}))
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            const cached = queryClient.getQueryData<WorkerProfileWithTradesRead>(['workerProfile'])
            expect(cached?.bio).toBe('New bio');
            expect(cached?.hourly_rate).toBe(existingProfile.hourly_rate);
            expect(cached?.trade_categories).toEqual(existingProfile.trade_categories);
        })
        it('does not show error toast on success', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...workerProfileRead})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.error).not.toHaveBeenCalled()
        })
    })
    // ─── Error ──────────────────────────────────────────────────────────────
    describe('on error', () => {
        it('shows error toast on API failure', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Failed to update worker profile')
        })
        it('does not show success toast on failure', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.success).not.toHaveBeenCalled()
        })
        it('does not invalidate query on failure', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockRejectedValue(new Error('Network error'))

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(invalidateSpy).not.toHaveBeenCalled()
        })
    })
    // ─── Mutation state ────────────────────────────────────────────────────────
    describe('mutation state', () => {
        it('is idle initially', () => {
            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )
            expect(result.current.isPending).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)
        })
        it('is pending during API call', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockImplementation(() => new Promise(() => {
            }))

            const {result} = renderHook(
                () => useUpdateWorkerProfile(),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
        })
    })
})


