import {useCallback} from 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'react-i18next'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import {setAccessToken} from '@/lib/api/apiClient'
import type {LoginPayload, LoginResponse} from '@/features/auth/types/auth.types'
import {clearCredentials, setCredentials} from "@/features/auth/store/authSlice";
import {useAppDispatch, useAppSelector} from "@/store/hooks"
import {USER_QUERY_KEY} from "@/features/user/hooks/useUser";
import {formatApiError} from './formatApiError'

export const useAuth = () => {
    const {t} = useTranslation('auth')
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const authState = useAppSelector((state) => state.auth)

    // ─── Login ────────────────────────────────────────────────────────────────

    const loginMutation = useMutation<LoginResponse, Error, LoginPayload>({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            // Store access token in memory (most secure — not in localStorage/sessionStorage)
            setAccessToken(data.access_token)
            dispatch(setCredentials(data.access_token))
            toast.success(t('toasts.welcomeBack'))
            navigate('/dashboard')
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t))
        },
    })

    // ─── Logout ───────────────────────────────────────────────────────────────

    const logoutMutation = useMutation<void, Error, void>({
        mutationFn: authApi.logout,
        onMutate: () => {
            queryClient.cancelQueries({queryKey: [USER_QUERY_KEY]})
        },
        onSettled: () => {
            // Always clear state — even if API call fails
            setAccessToken(null)
            dispatch(clearCredentials())
            queryClient.clear()
            navigate('/login')
        },
        onError: () => {
            toast.error(t('toasts.logoutFailed'))
        },
    })

    const login = useCallback(
        (payload: LoginPayload) => loginMutation.mutate(payload),
        [loginMutation],
    )

    const logout = useCallback(
        () => logoutMutation.mutate(),
        [logoutMutation],
    )

    return {
        ...authState,
        login,
        logout,
        isLoggingIn: loginMutation.isPending,
        isLoggingOut: logoutMutation.isPending,
    }
}