import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useUpdateNotificationPreference} from '../../hooks/useUpdateNotificationPreference'
import {NOTIFICATION_PREFERENCES_QUERY_KEY} from '../../hooks/useNotificationPreferences'
import {notificationApi} from '@/lib/api/notificationApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import type {NotificationPreference} from '../../types'

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        updateNotificationPreference: vi.fn(),
    },
}))

const mockUpdated: NotificationPreference = {event_type: 'job.started', channel: 'push', enabled: false}

describe('useUpdateNotificationPreference', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.updateNotificationPreference).mockResolvedValue(mockUpdated)
        queryClient = createQueryClient()
    })

    it('calls the API with the event type, channel, and enabled flag', async () => {
        const {result} = renderHook(() => useUpdateNotificationPreference(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({eventType: 'job.started', channel: 'push', enabled: false})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(notificationApi.updateNotificationPreference).toHaveBeenCalledWith('job.started', 'push', false)
    })

    it('invalidates the preferences query on success', async () => {
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useUpdateNotificationPreference(), {wrapper: createWrapper(queryClient)})

        result.current.mutate({eventType: 'job.started', channel: 'push', enabled: false})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY})
    })
})
