import {useMutation, useQueryClient} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {NOTIFICATIONS_QUERY_KEY} from './useNotifications'

export const useMarkNotificationRead = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: number) => notificationApi.markNotificationRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: NOTIFICATIONS_QUERY_KEY})
        },
    })
}
