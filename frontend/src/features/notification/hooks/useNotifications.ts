import {useQuery} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {getAccessToken} from '@/lib/api/apiClient'

export const NOTIFICATIONS_QUERY_KEY = ['notifications'] as const

interface UseNotificationsOptions {
    page?: number
    itemsPerPage?: number
    unreadOnly?: boolean
}

export const useNotifications = ({page = 1, itemsPerPage = 20, unreadOnly = false}: UseNotificationsOptions = {}) => {
    const hasToken = !!getAccessToken()
    return useQuery({
        queryKey: [...NOTIFICATIONS_QUERY_KEY, {page, itemsPerPage, unreadOnly}],
        queryFn: () => notificationApi.getNotifications(page, itemsPerPage, unreadOnly),
        staleTime: 30 * 1000,
        enabled: hasToken,
    })
}
