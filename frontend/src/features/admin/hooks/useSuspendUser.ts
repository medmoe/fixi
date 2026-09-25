import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'

export const useSuspendUser = (userId: number) => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (reason?: string) => adminApi.suspendUser(userId, reason),
        onSuccess: () => {
            toast.success(t('toasts.userSuspended'))
            // catches the list query, this user's detail, and their audit
            // log in one go -- all live under the ['admin', 'users', ...] prefix.
            queryClient.invalidateQueries({queryKey: ['admin', 'users']})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.suspendFailed'))
        },
    })
}
