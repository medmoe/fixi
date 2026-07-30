import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { userApi } from '@/lib/api/userApi'
import { USER_QUERY_KEY } from './useUser'
import type { UserUpdate } from '@/features/user'

export const useUpdateUser = (username: string) => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: UserUpdate) => userApi.updateUser(username, payload),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(USER_QUERY_KEY, updatedUser)
            toast.success('Account updated successfully')
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || 'Failed to update account'
            toast.error(msg)
        },
    })
}