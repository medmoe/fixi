import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useMarkWorkerBillingPaid} from '../useMarkWorkerBillingPaid'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        markWorkerBillingPaid: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useMarkWorkerBillingPaid', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.markWorkerBillingPaid with the billing id', async () => {
        vi.mocked(adminApi.markWorkerBillingPaid).mockResolvedValue(undefined)
        const {result} = renderHook(() => useMarkWorkerBillingPaid(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(adminApi.markWorkerBillingPaid).toHaveBeenCalledWith(1))
    })

    it('shows a success toast and invalidates the dashboard query on success', async () => {
        vi.mocked(adminApi.markWorkerBillingPaid).mockResolvedValue(undefined)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useMarkWorkerBillingPaid(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'worker-billing']})
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.markWorkerBillingPaid).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useMarkWorkerBillingPaid(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
