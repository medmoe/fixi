import {useMutation, useQueryClient} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {NOTIFICATIONS_QUERY_KEY} from './useNotifications'

export const useMarkAllNotificationsRead = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => notificationApi.markAllNotificationsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: NOTIFICATIONS_QUERY_KEY})
        },
    })
}
