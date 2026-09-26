import {beforeEach, describe, expect, it, vi} from 'vitest'
import apiClient from '../apiClient'
import {workerBillingApi} from '../workerBillingApi'

vi.mock('../apiClient', () => ({default: {get: vi.fn()}}))

describe('workerBillingApi', () => {
    beforeEach(() => vi.clearAllMocks())

    it('getMyBilling calls GET /worker-billing/me', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({data: [{id: 1}]})

        const result = await workerBillingApi.getMyBilling()

        expect(apiClient.get).toHaveBeenCalledWith('/worker-billing/me')
        expect(result).toEqual([{id: 1}])
    })

    it('downloadInvoice requests the PDF as a blob', async () => {
        const blob = new Blob(['%PDF'], {type: 'application/pdf'})
        vi.mocked(apiClient.get).mockResolvedValue({data: blob})

        const result = await workerBillingApi.downloadInvoice(4)

        expect(apiClient.get).toHaveBeenCalledWith('/worker-billing/4/invoice', {responseType: 'blob'})
        expect(result).toBe(blob)
    })
})
