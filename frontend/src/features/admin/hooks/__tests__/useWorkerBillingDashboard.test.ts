import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {WorkerBillingAdminRead} from '@/features/admin'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useWorkerBillingDashboard} from '../useWorkerBillingDashboard'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        listWorkerBilling: vi.fn(),
    },
}))

const mockRecords: WorkerBillingAdminRead[] = [
    {
        id: 1, worker_profile_id: 1, worker_name: 'Ali', worker_email: 'ali@example.com', job_id: 1,
        amount_owed: '5.00', amount_paid: '0.00', due_date: '2026-10-01T00:00:00Z',
        status: 'pending', is_overdue: false, payment_id: null, created_at: '2026-09-01T00:00:00Z',
    },
]

describe('useWorkerBillingDashboard', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('fetches records with the current filters', async () => {
        vi.mocked(adminApi.listWorkerBilling).mockResolvedValue(mockRecords)

        const {result} = renderHook(() => useWorkerBillingDashboard(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.records).toEqual(mockRecords)
        expect(adminApi.listWorkerBilling).toHaveBeenCalledWith({})
    })

    it('refetches when filters change', async () => {
        vi.mocked(adminApi.listWorkerBilling).mockResolvedValue(mockRecords)
        const {result} = renderHook(() => useWorkerBillingDashboard(), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.isLoading).toBe(false))

        act(() => result.current.updateFilters({status: 'paid'}))

        await waitFor(() => expect(adminApi.listWorkerBilling).toHaveBeenCalledWith({status: 'paid'}))
    })

    it('exposes isError when the query fails', async () => {
        vi.mocked(adminApi.listWorkerBilling).mockRejectedValue(new Error('failed'))

        const {result} = renderHook(() => useWorkerBillingDashboard(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isError).toBe(true))
    })
})
