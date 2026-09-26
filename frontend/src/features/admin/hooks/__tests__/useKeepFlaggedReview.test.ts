import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useKeepFlaggedReview} from '../useKeepFlaggedReview'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        approveFlaggedReview: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useKeepFlaggedReview', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.approveFlaggedReview with the review id', async () => {
        vi.mocked(adminApi.approveFlaggedReview).mockResolvedValue(undefined)
        const {result} = renderHook(() => useKeepFlaggedReview(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(3)

        await waitFor(() => expect(adminApi.approveFlaggedReview).toHaveBeenCalledWith(3))
    })

    it('shows a success toast and invalidates the flagged-review queue', async () => {
        vi.mocked(adminApi.approveFlaggedReview).mockResolvedValue(undefined)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useKeepFlaggedReview(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(3)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'flagged-reviews']})
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.approveFlaggedReview).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useKeepFlaggedReview(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(3)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
