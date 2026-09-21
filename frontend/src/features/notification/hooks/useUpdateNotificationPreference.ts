import {useMutation, useQueryClient} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {NOTIFICATION_PREFERENCES_QUERY_KEY} from './useNotificationPreferences'
import type {NotificationPreferenceChannel} from '../types'

export interface UpdateNotificationPreferenceInput {
    eventType: string
    channel: NotificationPreferenceChannel
    enabled: boolean
}

export const useUpdateNotificationPreference = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({eventType, channel, enabled}: UpdateNotificationPreferenceInput) =>
            notificationApi.updateNotificationPreference(eventType, channel, enabled),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY})
        },
    })
}
