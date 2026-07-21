import {useCallback} from 'react'
import {useNavigate} from 'react-router-dom'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import {setAccessToken} from '@/lib/api/apiClient'
import type {LoginPayload, LoginResponse} from '@/features/auth/types/auth.types'
import {clearCredentials, setCredentials} from "@/features/auth/store/authSlice";
import {useAppDispatch, useAppSelector} from "@/store/hooks"

const formatApiError = (error: any): string => {
    const detail = error?.response?.data?.detail

    if (Array.isArray(detail)) {
        if (detail.length === 0) {
            return 'Something went wrong. Please try again.'
        }
        return detail
            .map((err: any) => err.msg)
            .filter(Boolean)   // ← skip empty/undefined msgs
            .join('. ')
    }

    if (typeof detail === 'string' && detail.length > 0) {
        return detail
    }

    return 'Something went wrong. Please try again.'
}
export const useAuth = () => {
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
            toast.success('Welcome back!')
            navigate('/dashboard')
        },
        onError: (error: any) => {
            toast.error(formatApiError(error))
        },
    })

    // ─── Logout ───────────────────────────────────────────────────────────────

    const logoutMutation = useMutation<void, Error, void>({
        mutationFn: authApi.logout,
        onSettled: () => {
            // Always clear state — even if API call fails
            setAccessToken(null)
            dispatch(clearCredentials())
            queryClient.clear()
            navigate('/login')
        },
        onError: () => {
            toast.error('Logout failed — cleared local session anyway.')
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