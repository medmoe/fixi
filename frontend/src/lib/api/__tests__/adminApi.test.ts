import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminApi} from '../adminApi'
import apiClient from '../apiClient'
import type {UserRead} from '@/features/user'
import type {AdminActionLogRead} from '@/features/admin'
import type {PaginatedListResponse} from '@/features/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../apiClient', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser: UserRead = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    uuid: '12345678-1234-1234-1234-123456789012',
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

const mockListResponse: PaginatedListResponse<UserRead> = {
    data: [mockUser],
    total_count: 1,
    has_more: false,
    page: null,
    items_per_page: 20,
}

const mockAuditLog: AdminActionLogRead[] = [
    {
        id: 1,
        action: 'suspend_user',
        target_type: 'user',
        target_id: 1,
        actor_id: 2,
        reason: 'Policy violation',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: null,
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('adminApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('listUsers', () => {
        it('calls GET /admin/users with filters and pagination params', async () => {
            mockGet.mockResolvedValueOnce({data: mockListResponse})

            await adminApi.listUsers({search: 'john'}, 0, 20)

            expect(mockGet).toHaveBeenCalledWith('/admin/users', {
                params: {search: 'john', offset: 0, limit: 20},
            })
        })

        it('returns the paginated list', async () => {
            mockGet.mockResolvedValueOnce({data: mockListResponse})

            const result = await adminApi.listUsers({}, 0, 20)

            expect(result).toEqual(mockListResponse)
        })

        it('propagates errors from apiClient', async () => {
            mockGet.mockRejectedValueOnce(new Error('Forbidden'))

            await expect(adminApi.listUsers({}, 0, 20)).rejects.toThrow('Forbidden')
        })
    })

    describe('getUserDetail', () => {
        it('calls GET /admin/users/:id', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})

            await adminApi.getUserDetail(1)

            expect(mockGet).toHaveBeenCalledWith('/admin/users/1')
        })

        it('returns the user', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})

            const result = await adminApi.getUserDetail(1)

            expect(result).toEqual(mockUser)
        })
    })

    describe('getUserAuditLog', () => {
        it('calls GET /admin/users/:id/audit-log', async () => {
            mockGet.mockResolvedValueOnce({data: mockAuditLog})

            await adminApi.getUserAuditLog(1)

            expect(mockGet).toHaveBeenCalledWith('/admin/users/1/audit-log')
        })

        it('returns the audit log entries', async () => {
            mockGet.mockResolvedValueOnce({data: mockAuditLog})

            const result = await adminApi.getUserAuditLog(1)

            expect(result).toEqual(mockAuditLog)
        })
    })

    describe('suspendUser', () => {
        it('calls POST /admin/users/:id/suspend with a reason', async () => {
            mockPost.mockResolvedValueOnce({data: {...mockUser, is_suspended: true}})

            await adminApi.suspendUser(1, 'Policy violation')

            expect(mockPost).toHaveBeenCalledWith('/admin/users/1/suspend', {reason: 'Policy violation'})
        })

        it('sends a null reason when none is given', async () => {
            mockPost.mockResolvedValueOnce({data: {...mockUser, is_suspended: true}})

            await adminApi.suspendUser(1)

            expect(mockPost).toHaveBeenCalledWith('/admin/users/1/suspend', {reason: null})
        })

        it('returns the updated user', async () => {
            const suspended = {...mockUser, is_suspended: true}
            mockPost.mockResolvedValueOnce({data: suspended})

            const result = await adminApi.suspendUser(1)

            expect(result.is_suspended).toBe(true)
        })

        it('propagates errors from apiClient', async () => {
            mockPost.mockRejectedValueOnce(new Error('Already suspended'))

            await expect(adminApi.suspendUser(1)).rejects.toThrow('Already suspended')
        })
    })

    describe('reactivateUser', () => {
        it('calls POST /admin/users/:id/reactivate', async () => {
            mockPost.mockResolvedValueOnce({data: mockUser})

            await adminApi.reactivateUser(1, 'Appeal approved')

            expect(mockPost).toHaveBeenCalledWith('/admin/users/1/reactivate', {reason: 'Appeal approved'})
        })

        it('returns the updated user', async () => {
            mockPost.mockResolvedValueOnce({data: mockUser})

            const result = await adminApi.reactivateUser(1)

            expect(result.is_suspended).toBe(false)
        })
    })
})
