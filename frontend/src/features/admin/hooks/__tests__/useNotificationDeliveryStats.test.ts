import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useNotificationDeliveryStats} from '../useNotificationDeliveryStats'

vi.mock('@/lib/api/adminApi', () => ({adminApi: {getNotificationStats: vi.fn()}}))

describe('useNotificationDeliveryStats', () => {
    beforeEach(() => vi.clearAllMocks())

    it('fetches stats for the given trailing window', async () => {
        vi.mocked(adminApi.getNotificationStats).mockResolvedValue([])
        const {result} = renderHook(() => useNotificationDeliveryStats(168), {wrapper: createWrapper(createQueryClient())})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(adminApi.getNotificationStats).toHaveBeenCalledWith(168)
    })
})
