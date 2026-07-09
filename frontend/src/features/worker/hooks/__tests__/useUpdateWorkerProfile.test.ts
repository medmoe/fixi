import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from "@testing-library/react";
import {QueryClient} from "@tanstack/react-query";
import {workerApi} from "@/lib/api/workerApi.ts";
import {useUpdateWorkerProfile} from "../useUpdateWorkerProfile";
import {createQueryClient, createWrapper, mockProfile, WORKER_ID} from "./helpers";
import {toast} from "sonner";


// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi.ts', () => ({
    workerApi: {
        updateWorkerProfile: vi.fn()
    }
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn()
    }
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUpdateWorkerProfile', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createQueryClient();
        vi.clearAllMocks();

        // seed the cache with a profile before each test
        queryClient.setQueryData(['workerProfile', WORKER_ID], mockProfile);
    })

    // ─── API call ──────────────────────────────────────────────────────
    describe('API call', () => {
        it('calls updateWorkerProfile with correct workerId and payload', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...mockProfile, bio: 'updated bio'})
            const {result} = renderHook(
                () => useUpdateWorkerProfile(WORKER_ID),
                {wrapper: createWrapper(queryClient)}
            )
            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })
            expect(workerApi.updateWorkerProfile).toHaveBeenCalledWith(WORKER_ID, {bio: 'Updated bio'})
            expect(workerApi.updateWorkerProfile).toHaveBeenCalledTimes(1)
        })
        it('calls updateWorkerProfile with partial payload', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...mockProfile, hourly_rate: 90})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({hourly_rate: 90})
            })

            expect(workerApi.updateWorkerProfile).toHaveBeenCalledWith(WORKER_ID, {hourly_rate: 90})
        })
    })

    // ─── Success ───────────────────────────────────────────────────────────────

    describe('on success', () => {
        it('shows success toast', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...mockProfile})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Profile updated successfully')
        })
        it('invalidates workerProfile query on success', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...mockProfile})

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

            const {result} = renderHook(
                () => useUpdateWorkerProfile(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['workerProfile', WORKER_ID]})
        })
        it('does not show error toast on success', async () => {
            vi.mocked(workerApi.updateWorkerProfile).mockResolvedValue({...mockProfile})

            const {result} = renderHook(
                () => useUpdateWorkerProfile(WORKER_ID),
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
                () => useUpdateWorkerProfile(WORKER_ID),
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
                () => useUpdateWorkerProfile(WORKER_ID),
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
                () => useUpdateWorkerProfile(WORKER_ID),
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
                () => useUpdateWorkerProfile(WORKER_ID),
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
                () => useUpdateWorkerProfile(WORKER_ID),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate({bio: 'Updated bio'})
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
        })
    })
})


