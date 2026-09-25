import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {UserRead} from '@/features/user'
import type {AdminActionLogRead} from '@/features/admin'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useAdminUserDetail} from '../useAdminUserDetail'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        getUserDetail: vi.fn(),
        getUserAuditLog: vi.fn(),
    },
}))

const mockUser: UserRead = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    uuid: 'uuid-1',
    profile_image_url: 'https://example.com/image.jpg',
    role_type: 'worker',
    is_deleted: false,
    is_superuser: false,
    is_suspended: false,
    tier_id: 1,
    location: null,
    display_location: null,
    preferred_language: 'fr',
    deleted_at: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: null,
}

const mockAuditLog: AdminActionLogRead[] = [
    {id: 1, action: 'suspend_user', target_type: 'user', target_id: 1, actor_id: 2, reason: null, created_at: '2023-01-02T00:00:00Z', updated_at: null},
]

describe('useAdminUserDetail', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('fetches the user detail and audit log', async () => {
        vi.mocked(adminApi.getUserDetail).mockResolvedValue(mockUser)
        vi.mocked(adminApi.getUserAuditLog).mockResolvedValue(mockAuditLog)

        const {result} = renderHook(() => useAdminUserDetail(1), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.auditLog).toEqual(mockAuditLog)
    })

    it('calls both endpoints with the given user id', async () => {
        vi.mocked(adminApi.getUserDetail).mockResolvedValue(mockUser)
        vi.mocked(adminApi.getUserAuditLog).mockResolvedValue(mockAuditLog)

        renderHook(() => useAdminUserDetail(42), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(adminApi.getUserDetail).toHaveBeenCalledWith(42))
        expect(adminApi.getUserAuditLog).toHaveBeenCalledWith(42)
    })

    it('defaults auditLog to an empty array while loading', () => {
        vi.mocked(adminApi.getUserDetail).mockImplementation(() => new Promise(() => {}))
        vi.mocked(adminApi.getUserAuditLog).mockImplementation(() => new Promise(() => {}))

        const {result} = renderHook(() => useAdminUserDetail(1), {wrapper: createWrapper(queryClient)})

        expect(result.current.auditLog).toEqual([])
    })

    it('exposes the error when the user fetch fails', async () => {
        vi.mocked(adminApi.getUserDetail).mockRejectedValue(new Error('Not found'))
        vi.mocked(adminApi.getUserAuditLog).mockResolvedValue([])

        const {result} = renderHook(() => useAdminUserDetail(1), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.error).toBeTruthy())
    })
})
