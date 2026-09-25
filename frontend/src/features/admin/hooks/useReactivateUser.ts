import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'

export const useReactivateUser = (userId: number) => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (reason?: string) => adminApi.reactivateUser(userId, reason),
        onSuccess: () => {
            toast.success(t('toasts.userReactivated'))
            queryClient.invalidateQueries({queryKey: ['admin', 'users']})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.reactivateFailed'))
        },
    })
}
