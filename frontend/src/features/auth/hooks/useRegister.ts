import {useMutation} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import type {RegisterPayload, RegisterResponse} from '@/features/auth/types/auth.types'
import {translateApiErrorDetail} from './formatApiError'

export const useRegister = () => {
    const {t} = useTranslation('auth')
    const navigate = useNavigate()

    return useMutation<RegisterResponse, Error, RegisterPayload>({
        mutationFn: authApi.register,
        onSuccess: (data) => {
            toast.success(t('toasts.accountCreated', {username: data.username}))
            navigate('/login')
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail
            if (typeof detail === 'string') {
                toast.error(translateApiErrorDetail(detail, t))
            } else if (Array.isArray(detail)) {
                // Pydantic validation errors -- still raw/English, same as
                // the backend's other ~118 exception sites (see formatApiError.ts).
                detail.forEach((err: any) =>
                    toast.error(`${err.loc?.join('.')} — ${err.msg}`)
                )
            } else {
                toast.error(t('toasts.registrationFailed'))
            }
        },
    })
}