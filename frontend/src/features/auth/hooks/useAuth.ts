import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/lib/api/authApi'
import { toast } from 'sonner'
import type { LoginPayload, LoginResponse, AuthState } from '@/features/auth/types/auth.types'

export const useAuth = () => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const [authState, setAuthState] = useState<AuthState>({
        accessToken: sessionStorage.getItem('access_token'),
        isAuthenticated: !!sessionStorage.getItem('access_token'),
        isLoading: false,
    })

    // ─── Login ────────────────────────────────────────────────────────────────

    const loginMutation = useMutation<LoginResponse, Error, LoginPayload>({
        mutationFn: authApi.login,
        onSuccess: (data) => {
            sessionStorage.setItem('access_token', data.access_token)
            setAuthState({
                accessToken: data.access_token,
                isAuthenticated: true,
                isLoading: false,
            })
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
            sessionStorage.removeItem('access_token')
            setAuthState({
                accessToken: null,
                isAuthenticated: false,
                isLoading: false,
            })
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