import apiClient from './apiClient'
import type {LoginPayload, LoginResponse, RegisterPayload, RegisterResponse,} from '@/features/auth/types/auth.types'

export const authApi = {
    register: async (payload: RegisterPayload): Promise<RegisterResponse> => {
        const { data } = await apiClient.post('/auth/register', payload)
        return data
    },

    login: async (payload: LoginPayload): Promise<LoginResponse> => {
        const { data } = await apiClient.post('/auth/login', payload)
        return data
    },

    logout: async (): Promise<void> => {
        await apiClient.post('/api/v1/auth/logout')
    },

    refresh: async (): Promise<LoginResponse> => {
        const { data } = await apiClient.post('/auth/refresh')
        return data
    },
}