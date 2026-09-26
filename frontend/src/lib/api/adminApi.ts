import apiClient from '@/lib/api/apiClient'
import type {PaginatedListResponse} from '@/features/types'
import type {UserRead} from '@/features/user'
import type {AdminActionLogRead, AdminUserFilters, WorkerBillingAdminFilters, WorkerBillingAdminRead, WorkerVerificationQueueRead} from '@/features/admin'
import type {WorkerProfileRead} from '@/features/worker'

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
    listWorkerVerifications: async (): Promise<WorkerVerificationQueueRead[]> => {
        const {data} = await apiClient.get<WorkerVerificationQueueRead[]>('/admin/worker-verifications')
        return data
    },
    getVerificationDocumentUrl: async (workerProfileId: number): Promise<string> => {
        const {data} = await apiClient.get<{ url: string }>(`/admin/worker-verifications/${workerProfileId}/document-url`)
        return data.url
    },
    approveWorkerVerification: async (workerProfileId: number): Promise<WorkerProfileRead> => {
        const {data} = await apiClient.post<WorkerProfileRead>(`/admin/worker-verifications/${workerProfileId}/approve`)
        return data
    },
    rejectWorkerVerification: async (workerProfileId: number, reason: string): Promise<WorkerProfileRead> => {
        const {data} = await apiClient.post<WorkerProfileRead>(`/admin/worker-verifications/${workerProfileId}/reject`, {reason})
        return data
    },
    listWorkerBilling: async (filters: WorkerBillingAdminFilters): Promise<WorkerBillingAdminRead[]> => {
        const {data} = await apiClient.get<WorkerBillingAdminRead[]>('/worker-billing', {params: filters})
        return data
    },
    exportWorkerBillingCsv: async (filters: WorkerBillingAdminFilters): Promise<Blob> => {
        const {data} = await apiClient.get('/worker-billing/export', {params: filters, responseType: 'blob'})
        return data
    },
    markWorkerBillingPaid: async (workerBillingId: number): Promise<void> => {
        await apiClient.patch(`/worker-billing/${workerBillingId}/mark-paid`)
    },
}
