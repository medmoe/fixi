import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useRejectVerification} from '../useRejectVerification'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        rejectWorkerVerification: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useRejectVerification', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.rejectWorkerVerification with the id and reason', async () => {
        vi.mocked(adminApi.rejectWorkerVerification).mockResolvedValue({is_verified: false} as any)
        const {result} = renderHook(() => useRejectVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({workerProfileId: 1, reason: 'Blurry photo'})

        await waitFor(() => expect(adminApi.rejectWorkerVerification).toHaveBeenCalledWith(1, 'Blurry photo'))
    })

    it('shows a success toast on success', async () => {
        vi.mocked(adminApi.rejectWorkerVerification).mockResolvedValue({is_verified: false} as any)
        const {result} = renderHook(() => useRejectVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({workerProfileId: 1, reason: 'Blurry photo'})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
    })

    it('invalidates the verification queue on success', async () => {
        vi.mocked(adminApi.rejectWorkerVerification).mockResolvedValue({is_verified: false} as any)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useRejectVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({workerProfileId: 1, reason: 'Blurry photo'})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'worker-verifications']})
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.rejectWorkerVerification).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useRejectVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({workerProfileId: 1, reason: 'Blurry photo'})

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
