import type {AxiosInstance, InternalAxiosRequestConfig} from 'axios'
import axios from 'axios'

// ─── Token Storage (Memory Only — Most Secure) ────────────────────────────────
// Access token is stored ONLY in memory (never localStorage/sessionStorage/cookies).
// This prevents XSS token theft. On page refresh, the token is lost and a silent
// refresh is performed using the httpOnly refresh_token cookie.
//
// Security: XSS cannot steal what it cannot access. The refresh_token is httpOnly
// so it's never exposed to JavaScript.

let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
    accessToken = token
}

export const getAccessToken = (): string | null => accessToken

// ─── Axios Instance ───────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
    withCredentials: true,   // ✅ sends httpOnly refresh_token cookie automatically
    headers: {
        'Content-Type': 'application/json',
    },
})

// ─── Request Interceptor — attach access token from memory ──────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Response Interceptor — silent token refresh ──────────────────────────────

let isRefreshing = false
let failedQueue: Array<{
    resolve: (token: string) => void
    reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token!)
        }
    })
    failedQueue = []
}

// Auth endpoints that should NOT trigger token refresh on 401
const AUTH_ENDPOINTS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/logout',
]

const isAuthEndpoint = (url?: string): boolean => {
    if (!url) return false
    return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint))
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        // Skip refresh logic for auth endpoints — their 401s are legitimate
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !isAuthEndpoint(originalRequest.url)
        ) {
            if (isRefreshing) {
                // Queue requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({resolve, reject})
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return apiClient(originalRequest)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Backend reads refresh_token from httpOnly cookie (withCredentials)
                // and returns new access_token in response body
                const {data} = await apiClient.post('/api/v1/auth/refresh')
                const newToken = data.access_token

                // Store new access token in memory only
                setAccessToken(newToken)

                // Update default header for subsequent requests
                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`

                processQueue(null, newToken)
                return apiClient(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                setAccessToken(null)
                window.location.href = '/login'
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    },
)

export default apiClient