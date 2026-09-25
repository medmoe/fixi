import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {userApi} from '@/lib/api/userApi'
import {formatApiError} from '@/lib/api/formatApiError'

export const useDeactivateAccount = (username: string) => {
    const {t} = useTranslation('account')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => userApi.deleteUser(username),
        onSuccess: () => {
            toast.success(t('toasts.accountDeactivated'))
            queryClient.clear()
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.accountDeactivateFailed'))
        },
    })
}