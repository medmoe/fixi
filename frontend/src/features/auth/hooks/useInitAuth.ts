import {useNavigate} from 'react-router-dom'
import {useQuery} from '@tanstack/react-query'
import {getAccessToken, setAccessToken} from '@/lib/api/apiClient'
import {authApi} from '@/lib/api/authApi'
import {useAuth} from './useAuth'

/**
 * useInitAuth — Handles silent token refresh on app initialization.
 *
 * On page refresh, the access token in memory is lost. This hook attempts
 * to silently refresh using the httpOnly refresh_token cookie. If successful,
 * the new access_token is stored in memory. If it fails, the user is
 * redirected to login.
 */
export const useInitAuth = () => {
    const navigate = useNavigate()
    const {logout} = useAuth()

    const {isLoading} = useQuery({
        queryKey: ['auth', 'init'],
        queryFn: async () => {
            // Only refresh if we don't already have a token in memory
            if (getAccessToken()) {
                return {initialized: true}
            }

            try {
                const {access_token} = await authApi.refresh()
                setAccessToken(access_token)
                return {initialized: true, refreshed: true}
            } catch {
                // Silent refresh failed — user needs to log in
                logout()
                navigate('/login')
                return {initialized: false}
            }
        },
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    })

    return {isLoading}
}