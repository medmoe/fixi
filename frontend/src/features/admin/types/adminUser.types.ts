import type {RoleType} from '@/features/auth'

export interface AdminUserFilters {
    search?: string
    role_type?: RoleType
    is_suspended?: boolean
}

export interface AdminActionLogRead {
    id: number
    action: string
    target_type: string
    target_id: number
    actor_id: number | null
    reason: string | null
    created_at: string
    updated_at: string | null
}

export interface UserSuspendPayload {
    reason?: string
}
