import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useApproveVerification} from '../useApproveVerification'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        approveWorkerVerification: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useApproveVerification', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.approveWorkerVerification with the worker profile id', async () => {
        vi.mocked(adminApi.approveWorkerVerification).mockResolvedValue({is_verified: true} as any)
        const {result} = renderHook(() => useApproveVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(adminApi.approveWorkerVerification).toHaveBeenCalledWith(1))
    })

    it('shows a success toast on success', async () => {
        vi.mocked(adminApi.approveWorkerVerification).mockResolvedValue({is_verified: true} as any)
        const {result} = renderHook(() => useApproveVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
    })

    it('invalidates the verification queue on success', async () => {
        vi.mocked(adminApi.approveWorkerVerification).mockResolvedValue({is_verified: true} as any)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useApproveVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'worker-verifications']})
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.approveWorkerVerification).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useApproveVerification(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
