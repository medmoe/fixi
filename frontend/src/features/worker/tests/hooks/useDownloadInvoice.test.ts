import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {toast} from 'sonner'
import {workerBillingApi} from '@/lib'
import {downloadBlob} from '@/lib/downloadBlob'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useDownloadInvoice} from '../../hooks/useDownloadInvoice'

vi.mock('@/lib', () => ({workerBillingApi: {downloadInvoice: vi.fn()}}))
vi.mock('@/lib/downloadBlob', () => ({downloadBlob: vi.fn()}))
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}))

describe('useDownloadInvoice', () => {
    beforeEach(() => vi.clearAllMocks())

    it('downloads the PDF named after the billing record', async () => {
        const blob = new Blob(['%PDF'], {type: 'application/pdf'})
        vi.mocked(workerBillingApi.downloadInvoice).mockResolvedValue(blob)
        const {result} = renderHook(() => useDownloadInvoice(), {wrapper: createWrapper(createQueryClient())})

        result.current.mutate(9)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(workerBillingApi.downloadInvoice).toHaveBeenCalledWith(9)
        expect(downloadBlob).toHaveBeenCalledWith(blob, 'invoice-9.pdf')
    })

    it('shows an error toast when the download fails', async () => {
        vi.mocked(workerBillingApi.downloadInvoice).mockRejectedValue(new Error('403'))
        const {result} = renderHook(() => useDownloadInvoice(), {wrapper: createWrapper(createQueryClient())})

        result.current.mutate(9)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
        expect(downloadBlob).not.toHaveBeenCalled()
    })
})
