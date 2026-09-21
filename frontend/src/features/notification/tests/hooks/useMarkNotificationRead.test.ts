import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useMarkNotificationRead} from '../../hooks/useMarkNotificationRead'
import {NOTIFICATIONS_QUERY_KEY} from '../../hooks/useNotifications'
import {notificationApi} from '@/lib/api/notificationApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import type {NotificationRead} from '../../types'

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        markNotificationRead: vi.fn(),
    },
}))

const mockNotification: NotificationRead = {
    id: 1,
    user_id: 1,
    type: 'job.status_changed',
    title_ar: 'عنوان',
    title_fr: 'Titre',
    body_ar: 'نص',
    body_fr: 'Corps',
    read_at: '2026-09-21T10:00:00Z',
    related_job_id: null,
    created_at: '2026-09-21T09:00:00Z',
}

describe('useMarkNotificationRead', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.markNotificationRead).mockResolvedValue(mockNotification)
        queryClient = createQueryClient()
    })

    it('calls the API with the notification id', async () => {
        const {result} = renderHook(() => useMarkNotificationRead(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(notificationApi.markNotificationRead).toHaveBeenCalledWith(1)
    })

    it('invalidates the notifications queries on success', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useMarkNotificationRead(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: NOTIFICATIONS_QUERY_KEY})
    })
})
