import apiClient from '@/lib/api/apiClient'
import type {PaginatedListResponse} from '@/features/types'
import type {UserRead} from '@/features/user'
import type {AdminActionLogRead, AdminUserFilters} from '@/features/admin'

export const adminApi = {
    listUsers: async (filters: AdminUserFilters, offset: number, limit: number): Promise<PaginatedListResponse<UserRead>> => {
        const params = {...filters, offset, limit}
        const {data} = await apiClient.get<PaginatedListResponse<UserRead>>('/admin/users', {params})
        return data
    },
    getUserDetail: async (userId: number): Promise<UserRead> => {
        const {data} = await apiClient.get<UserRead>(`/admin/users/${userId}`)
        return data
    },
    getUserAuditLog: async (userId: number): Promise<AdminActionLogRead[]> => {
        const {data} = await apiClient.get<AdminActionLogRead[]>(`/admin/users/${userId}/audit-log`)
        return data
    },
    suspendUser: async (userId: number, reason?: string): Promise<UserRead> => {
        const {data} = await apiClient.post<UserRead>(`/admin/users/${userId}/suspend`, {reason: reason ?? null})
        return data
    },
    reactivateUser: async (userId: number, reason?: string): Promise<UserRead> => {
        const {data} = await apiClient.post<UserRead>(`/admin/users/${userId}/reactivate`, {reason: reason ?? null})
        return data
    },
}
