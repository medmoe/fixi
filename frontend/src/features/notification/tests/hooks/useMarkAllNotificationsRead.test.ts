import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useMarkAllNotificationsRead} from '../../hooks/useMarkAllNotificationsRead'
import {NOTIFICATIONS_QUERY_KEY} from '../../hooks/useNotifications'
import {notificationApi} from '@/lib/api/notificationApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        markAllNotificationsRead: vi.fn(),
    },
}))

describe('useMarkAllNotificationsRead', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.markAllNotificationsRead).mockResolvedValue(undefined)
        queryClient = createQueryClient()
    })

    it('calls the API', async () => {
        const {result} = renderHook(() => useMarkAllNotificationsRead(), {wrapper: createWrapper(queryClient)})

        result.current.mutate()

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(notificationApi.markAllNotificationsRead).toHaveBeenCalled()
    })

    it('invalidates the notifications queries on success', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useMarkAllNotificationsRead(), {wrapper: createWrapper(queryClient)})

        result.current.mutate()

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: NOTIFICATIONS_QUERY_KEY})
    })
})
