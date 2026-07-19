import {useMutation} from '@tanstack/react-query'
import {toast} from 'sonner'
import {userApi} from '@/lib/api/userApi'
import type {UserChangePasswordPayload} from '@/features/user'

export const useChangePassword = (username: string) => {
    return useMutation({
        mutationFn: (payload: UserChangePasswordPayload) =>
            userApi.changePassword(username, payload),
        onSuccess: () => {
            toast.success('Password changed successfully')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || 'Failed to change password'
            toast.error(msg)
        },
    })
}