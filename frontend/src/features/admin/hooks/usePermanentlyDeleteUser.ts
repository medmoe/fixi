import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'

export const usePermanentlyDeleteUser = (userId: number) => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (reason?: string) => adminApi.permanentlyDeleteUser(userId, reason),
        onSuccess: () => {
            toast.success(t('toasts.userDeleted'))
            navigate('/admin/users', {replace: true})
            // This user's detail/audit-log queries would only 404 now -- drop
            // them, and refresh everything else under ['admin', 'users'] (the list).
            queryClient.removeQueries({queryKey: ['admin', 'users', userId]})
            queryClient.invalidateQueries({
                queryKey: ['admin', 'users'],
                predicate: (query) => query.queryKey[2] !== userId,
            })
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.deleteUserFailed'))
        },
    })
}
