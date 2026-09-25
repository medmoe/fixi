import {useMutation} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {userApi} from '@/lib/api/userApi'
import {formatApiError} from '@/lib/api/formatApiError'
import type {UserChangePasswordPayload} from '@/features/user'

export const useChangePassword = (username: string) => {
    const {t} = useTranslation('account')

    return useMutation({
        mutationFn: (payload: UserChangePasswordPayload) =>
            userApi.changePassword(username, payload),
        onSuccess: () => {
            toast.success(t('toasts.passwordChanged'))
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.passwordChangeFailed'))
        },
    })
}