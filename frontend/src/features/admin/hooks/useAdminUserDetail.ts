import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'

export const useAdminUserDetail = (userId: number) => {
    const userQuery = useQuery({
        queryKey: ['admin', 'users', userId],
        queryFn: () => adminApi.getUserDetail(userId),
        enabled: Number.isFinite(userId),
    })

    const auditLogQuery = useQuery({
        queryKey: ['admin', 'users', userId, 'audit-log'],
        queryFn: () => adminApi.getUserAuditLog(userId),
        enabled: Number.isFinite(userId),
    })

    return {
        user: userQuery.data,
        isLoading: userQuery.isLoading,
        error: userQuery.error,
        auditLog: auditLogQuery.data ?? [],
        isLoadingAuditLog: auditLogQuery.isLoading,
    }
}
