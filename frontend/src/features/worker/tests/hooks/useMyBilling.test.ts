import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {workerBillingApi} from '@/lib'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useMyBilling} from '../../hooks/useMyBilling'

vi.mock('@/lib', () => ({workerBillingApi: {getMyBilling: vi.fn()}}))

describe('useMyBilling', () => {
    beforeEach(() => vi.clearAllMocks())

    it('fetches the worker\'s own billing records', async () => {
        vi.mocked(workerBillingApi.getMyBilling).mockResolvedValue([{id: 1} as any])
        const {result} = renderHook(() => useMyBilling(), {wrapper: createWrapper(createQueryClient())})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual([{id: 1}])
    })
})
