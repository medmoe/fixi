import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'

export const useNotificationDeliveryStats = (sinceHours: number) => {
    return useQuery({
        queryKey: ['admin', 'notification-stats', sinceHours],
        queryFn: () => adminApi.getNotificationStats(sinceHours),
    })
}
