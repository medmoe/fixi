import {useMutation} from '@tanstack/react-query'
import {useNavigate} from 'react-router-dom'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import type {RegisterPayload, RegisterResponse} from '@/features/auth/types/auth.types'

export const useRegister = () => {
    const navigate = useNavigate()

    return useMutation<RegisterResponse, Error, RegisterPayload>({
        mutationFn: authApi.register,
        onSuccess: (data) => {
            toast.success(`Account created! Welcome, ${data.username}.`)
            navigate('/login')
        },
        onError: (error: any) => {
            const detail = error.response?.data?.detail
            if (typeof detail === 'string') {
                toast.error(detail)
            } else if (Array.isArray(detail)) {
                // Pydantic validation errors
                detail.forEach((err: any) =>
                    toast.error(`${err.loc?.join('.')} — ${err.msg}`)
                )
            } else {
                toast.error('Registration failed. Please try again.')
            }
        },
    })
}