import {useCallback} from 'react'
import {useNavigate} from 'react-router-dom'
import {useMutation, useQueryClient} from '@tanstack/react-query'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import type {LoginPayload, LoginResponse} from '@/features/auth/types/auth.types'
import {clearCredentials, setCredentials} from "@/features/auth/store/authSlice";
import {useAppDispatch, useAppSelector} from "@/store/hooks"

export const useAuth = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const authState = useAppSelector((state) => state.auth)

    // ─── Login ────────────────────────────────────────────────────────────────

    const loginMutation = useMutation<LoginResponse, Error, LoginPayload>({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            dispatch(setCredentials(data.access_token))
            toast.success('Welcome back!')
            navigate('/dashboard')
        },
        onError: (error: any) => {
            const message = error.response?.data?.detail ?? 'Login failed. Please try again.'
            toast.error(message)
        },
    })

    // ─── Logout ───────────────────────────────────────────────────────────────

    const logoutMutation = useMutation<void, Error, void>({
        mutationFn: authApi.logout,
        onSettled: () => {
            // always clear state — even if API call fails
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