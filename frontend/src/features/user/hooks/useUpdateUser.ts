import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { userApi } from '@/lib/api/userApi'
import { formatApiError } from '@/lib/api/formatApiError'
import { USER_QUERY_KEY } from './useUser'
import type { UserUpdate } from '@/features/user'
import {useAppDispatch} from "@/store/hooks";
import {setLocation} from "@/features/user/userSlice";

export const useUpdateUser = (username: string) => {
    const {t} = useTranslation('account')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch();

    return useMutation({
        mutationFn: (payload: UserUpdate) => userApi.updateUser(username, payload),
        onSuccess: (updatedUser, variables) => {
            dispatch(
                setLocation({
                    displayLocation: variables.display_location,
                    latitude: variables.latitude,
                    longitude: variables.longitude,
                })
            )
            queryClient.setQueryData(USER_QUERY_KEY, updatedUser)
            toast.success(t('toasts.accountUpdated'))
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.accountUpdateFailed'))
        },
    })
}