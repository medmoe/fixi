import {useMutation, useQueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {userApi} from '@/lib/api/userApi'

export const useDeactivateAccount = (username: string) => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => userApi.deleteUser(username),
        onSuccess: () => {
            toast.success('Account deactivated')
            queryClient.clear()
        },
        onError: (error: any) => {
            const msg = error.response?.data?.detail || 'Failed to deactivate account'
            toast.error(msg)
        },
    })
}