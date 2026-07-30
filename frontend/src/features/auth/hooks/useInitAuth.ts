import {useQuery} from '@tanstack/react-query'
import {getAccessToken, setAccessToken} from '@/lib/api/apiClient'
import {clearCredentials, setCredentials} from "@/features/auth/store/authSlice.ts";
import {useAppDispatch} from "@/store/hooks";
import {authApi} from "@/lib/api/authApi"

/**
 * useInitAuth — Handles silent token refresh on app initialization.
 *
 * On page refresh, the access token in memory is lost. This hook attempts
 * to silently refresh using the httpOnly refresh_token cookie. If successful,
 * the new access_token is stored in memory. If it fails, the user is
 * redirected to login.
 */
export const useInitAuth = () => {
    const dispatch = useAppDispatch()
    const hasToken = !!getAccessToken()

    const {isLoading, isError, data} = useQuery({
        queryKey: ['auth', 'init'],
        queryFn: async () => {
            try {
                const response = await authApi.refresh()
                const access_token = response.access_token
                setAccessToken(access_token)
                dispatch(setCredentials(access_token))
                return response
            } catch (error) {
                setAccessToken(null)
                dispatch(clearCredentials())
                throw error
            }
        },
        enabled: !hasToken,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: Infinity,
    })
    return {
        isLoading,
        isError,
        isAuthenticated: hasToken ? true : !!data,
    }
}