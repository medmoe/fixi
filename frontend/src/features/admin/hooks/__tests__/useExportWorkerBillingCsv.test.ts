import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useExportWorkerBillingCsv} from '../useExportWorkerBillingCsv'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        exportWorkerBillingCsv: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useExportWorkerBillingCsv', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
        URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
        URL.revokeObjectURL = vi.fn()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('calls adminApi.exportWorkerBillingCsv with the given filters', async () => {
        vi.mocked(adminApi.exportWorkerBillingCsv).mockResolvedValue(new Blob(['csv']))
        const {result} = renderHook(() => useExportWorkerBillingCsv(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({status: 'paid'})

        await waitFor(() => expect(adminApi.exportWorkerBillingCsv).toHaveBeenCalledWith({status: 'paid'}))
    })

    it('triggers a file download on success', async () => {
        vi.mocked(adminApi.exportWorkerBillingCsv).mockResolvedValue(new Blob(['csv']))
        const anchor = document.createElement('a')
        const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {})
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor)

        const {result} = renderHook(() => useExportWorkerBillingCsv(), {wrapper: createWrapper(queryClient)})
        result.current.mutate({})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(clickSpy).toHaveBeenCalled()
        expect(anchor.download).toBe('worker-billing.csv')
        expect(URL.createObjectURL).toHaveBeenCalled()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

        createElementSpy.mockRestore()
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.exportWorkerBillingCsv).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useExportWorkerBillingCsv(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({})

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
