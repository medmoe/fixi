import axios from 'axios'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const apiClient: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1',
    withCredentials: true,   // ✅ sends refresh token cookie automatically
    headers: {
        'Content-Type': 'application/json',
    },
})

// ─── Request interceptor — attach access token ────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem('access_token')
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// ─── Response interceptor — silent token refresh ──────────────────────────────

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

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // ✅ queue requests while refresh is in progress
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return apiClient(originalRequest)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                const { data } = await apiClient.post('/api/v1/auth/refresh')
                const newToken = data.access_token
                sessionStorage.setItem('access_token', newToken)
                apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`
                processQueue(null, newToken)
                return apiClient(originalRequest)
            } catch (refreshError) {
                processQueue(refreshError, null)
                sessionStorage.removeItem('access_token')
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