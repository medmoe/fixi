import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {NOTIFICATION_PREFERENCES_QUERY_KEY, useNotificationPreferences} from '../../hooks/useNotificationPreferences'
import {notificationApi} from '@/lib/api/notificationApi'
import {getAccessToken} from '@/lib/api/apiClient'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import type {NotificationPreference} from '../../types'

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        getNotificationPreferences: vi.fn(),
    },
}))

vi.mock('@/lib/api/apiClient', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api/apiClient')>('@/lib/api/apiClient')
    return {...actual, getAccessToken: vi.fn(() => 'a-token')}
})

const mockPreferences: NotificationPreference[] = [
    {event_type: 'job.started', channel: 'push', enabled: true},
    {event_type: 'review_received', channel: 'push', enabled: true},
    {event_type: 'review_received', channel: 'email', enabled: false},
]

describe('useNotificationPreferences', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.getNotificationPreferences).mockResolvedValue(mockPreferences)
        queryClient = createQueryClient()
    })

    it('fetches the preference matrix', async () => {
        const {result} = renderHook(() => useNotificationPreferences(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(notificationApi.getNotificationPreferences).toHaveBeenCalled()
        expect(result.current.data).toEqual(mockPreferences)
    })

    it('uses NOTIFICATION_PREFERENCES_QUERY_KEY so invalidation catches it', async () => {
        renderHook(() => useNotificationPreferences(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => {
            const matches = queryClient.getQueryCache().findAll({queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY})
            expect(matches.length).toBeGreaterThan(0)
        })
    })

    it('does not fetch when there is no access token', () => {
        vi.mocked(getAccessToken).mockReturnValueOnce(null)

        renderHook(() => useNotificationPreferences(), {wrapper: createWrapper(queryClient)})

        expect(notificationApi.getNotificationPreferences).not.toHaveBeenCalled()
    })
})
