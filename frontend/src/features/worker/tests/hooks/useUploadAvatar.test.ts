import {beforeEach, describe, expect, it, vi} from 'vitest'
import {QueryClient} from '@tanstack/react-query'
import {createQueryClient, createWrapper, mockProfile} from "@/features/worker/tests/helpers.tsx";
import {act, renderHook, waitFor} from '@testing-library/react'
import {useUploadAvatar, type WorkerProfileWithTradesRead} from "@/features/worker";
import {workerApi} from "@/lib/api/workerApi.ts";
import {toast} from "sonner";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        uploadAvatar: vi.fn()
    }
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}))
const {trade_categories, avatar_url, ...workerProfileRead} = mockProfile

describe('useUploadAvatar', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = createQueryClient()
        vi.clearAllMocks()
        queryClient.setQueryData<WorkerProfileWithTradesRead>(['workerProfile'], mockProfile)
    })

    const mockFile = new File(['image content'], 'avatar.png', {type: 'image/png'})

    // ─── API call ──────────────────────────────────────────────────────────────

    describe('API call', () => {
        it('calls uploadAvatar with file', async () => {
            vi.mocked(workerApi.uploadAvatar).mockResolvedValue({avatar_url: 'https://cdn.example.com/avatar.png', ...workerProfileRead})

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            expect(workerApi.uploadAvatar).toHaveBeenCalledWith(mockFile)
            expect(workerApi.uploadAvatar).toHaveBeenCalledTimes(1)
        })

        it('passes the exact File object to the API', async () => {
            vi.mocked(workerApi.uploadAvatar).mockResolvedValue({avatar_url: 'https://cdn.example.com/avatar.png', ...workerProfileRead})

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            const calledWith = vi.mocked(workerApi.uploadAvatar).mock.calls[0][0]
            expect(calledWith).toBe(mockFile)  // same reference, not a copy
            expect(calledWith.name).toBe('avatar.png')
            expect(calledWith.type).toBe('image/png')
        })
    })

    // ─── Success ───────────────────────────────────────────────────────────────

    describe('on success', () => {
        it('shows success toast', async () => {
            vi.mocked(workerApi.uploadAvatar).mockResolvedValue({avatar_url: 'https://cdn.example.com/avatar.png', ...workerProfileRead})

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Avatar uploaded successfully')
        })

        it('update cache on success', async () => {
            vi.mocked(workerApi.uploadAvatar).mockResolvedValue({avatar_url: 'https://cdn.example.com/avatar.png', ...workerProfileRead})
            const existingProfile: WorkerProfileWithTradesRead = {
                ...mockProfile,
                avatar_url: 'http://minio.com/old.png',
                trade_categories: [
                    {id: 1, skill_level: "junior", worker_profile_id: mockProfile.id, trade_category_id: 10, trade_category: null}
                ]
            }
            queryClient.setQueryData(['workerProfile'], existingProfile)

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )
            await act(async () => {
                result.current.mutate(mockFile)
            })
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            const cached = queryClient.getQueryData<WorkerProfileWithTradesRead>(['workerProfile'])
            expect(cached?.avatar_url).toBe('https://cdn.example.com/avatar.png')
            expect(cached?.trade_categories).toEqual(existingProfile.trade_categories)
        })

        it('does not show error toast on success', async () => {
            vi.mocked(workerApi.uploadAvatar).mockResolvedValue({avatar_url: 'https://cdn.example.com/avatar.png', ...workerProfileRead})

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.error).not.toHaveBeenCalled()
        })
    })

    // ─── Error ─────────────────────────────────────────────────────────────────

    describe('on error', () => {
        it('shows error toast on upload failure', async () => {
            vi.mocked(workerApi.uploadAvatar).mockRejectedValue(new Error('Upload failed'))

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Failed to upload avatar')
        })

        it('does not show success toast on failure', async () => {
            vi.mocked(workerApi.uploadAvatar).mockRejectedValue(new Error('Upload failed'))

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.success).not.toHaveBeenCalled()
        })

        it('does not invalidate query on failure', async () => {
            vi.mocked(workerApi.uploadAvatar).mockRejectedValue(new Error('Upload failed'))

            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(invalidateSpy).not.toHaveBeenCalled()
        })
    })

    // ─── Mutation state ────────────────────────────────────────────────────────

    describe('mutation state', () => {
        it('is idle initially', () => {
            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )
            expect(result.current.isPending).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)
        })

        it('is pending during upload', async () => {
            vi.mocked(workerApi.uploadAvatar).mockImplementation(() => new Promise(() => {
            })) // never resolves

            const {result} = renderHook(
                () => useUploadAvatar(),
                {wrapper: createWrapper(queryClient)},
            )

            act(() => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
        })
    })
})

