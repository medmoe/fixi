import {useQuery} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {getAccessToken} from '@/lib/api/apiClient'

export const NOTIFICATION_PREFERENCES_QUERY_KEY = ['notification-preferences'] as const

export const useNotificationPreferences = () => {
    const hasToken = !!getAccessToken()
    return useQuery({
        queryKey: NOTIFICATION_PREFERENCES_QUERY_KEY,
        queryFn: () => notificationApi.getNotificationPreferences(),
        staleTime: 60 * 1000,
        enabled: hasToken,
    })
}
