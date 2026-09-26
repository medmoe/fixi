import {beforeEach, describe, expect, it, vi} from 'vitest'
import {adminApi} from '../adminApi'
import apiClient from '../apiClient'
import type {UserRead} from '@/features/user'
import type {
    AdminActionLogRead,
    ConversionFunnelRead,
    PlatformBreakdownRead,
    PlatformOverviewRead,
    WorkerBillingAdminRead,
    WorkerVerificationQueueRead,
} from '@/features/admin'
import type {PaginatedListResponse} from '@/features/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../apiClient', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
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

const mockVerificationQueue: WorkerVerificationQueueRead[] = [
    {id: 1, user_id: 1, name: 'Ali', email: 'ali@example.com', bio: 'Plumber', years_of_experience: 5},
]

const mockBillingRecords: WorkerBillingAdminRead[] = [
    {
        id: 1, worker_profile_id: 1, worker_name: 'Ali', worker_email: 'ali@example.com', job_id: 1,
        amount_owed: '5.00', amount_paid: '0.00', due_date: '2026-10-01T00:00:00Z',
        status: 'pending', is_overdue: false, payment_id: null, created_at: '2026-09-01T00:00:00Z',
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockPatch = vi.mocked(apiClient.patch)

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

    describe('listWorkerVerifications', () => {
        it('calls GET /admin/worker-verifications', async () => {
            mockGet.mockResolvedValueOnce({data: mockVerificationQueue})

            await adminApi.listWorkerVerifications()

            expect(mockGet).toHaveBeenCalledWith('/admin/worker-verifications')
        })

        it('returns the queue', async () => {
            mockGet.mockResolvedValueOnce({data: mockVerificationQueue})

            const result = await adminApi.listWorkerVerifications()

            expect(result).toEqual(mockVerificationQueue)
        })
    })

    describe('getVerificationDocumentUrl', () => {
        it('calls GET /admin/worker-verifications/:id/document-url', async () => {
            mockGet.mockResolvedValueOnce({data: {url: 'https://signed.example.com/cni.pdf'}})

            await adminApi.getVerificationDocumentUrl(1)

            expect(mockGet).toHaveBeenCalledWith('/admin/worker-verifications/1/document-url')
        })

        it('returns the url', async () => {
            mockGet.mockResolvedValueOnce({data: {url: 'https://signed.example.com/cni.pdf'}})

            const result = await adminApi.getVerificationDocumentUrl(1)

            expect(result).toBe('https://signed.example.com/cni.pdf')
        })
    })

    describe('approveWorkerVerification', () => {
        it('calls POST /admin/worker-verifications/:id/approve', async () => {
            mockPost.mockResolvedValueOnce({data: {...mockUser, is_verified: true}})

            await adminApi.approveWorkerVerification(1)

            expect(mockPost).toHaveBeenCalledWith('/admin/worker-verifications/1/approve')
        })
    })

    describe('rejectWorkerVerification', () => {
        it('calls POST /admin/worker-verifications/:id/reject with the reason', async () => {
            mockPost.mockResolvedValueOnce({data: {...mockUser, is_verified: false}})

            await adminApi.rejectWorkerVerification(1, 'Document is blurry')

            expect(mockPost).toHaveBeenCalledWith('/admin/worker-verifications/1/reject', {reason: 'Document is blurry'})
        })
    })

    describe('listWorkerBilling', () => {
        it('calls GET /worker-billing with the given filters', async () => {
            mockGet.mockResolvedValueOnce({data: mockBillingRecords})

            await adminApi.listWorkerBilling({status: 'paid'})

            expect(mockGet).toHaveBeenCalledWith('/worker-billing', {params: {status: 'paid'}})
        })

        it('returns the records', async () => {
            mockGet.mockResolvedValueOnce({data: mockBillingRecords})

            const result = await adminApi.listWorkerBilling({})

            expect(result).toEqual(mockBillingRecords)
        })
    })

    describe('exportWorkerBillingCsv', () => {
        it('calls GET /worker-billing/export with filters and blob response type', async () => {
            const blob = new Blob(['csv'])
            mockGet.mockResolvedValueOnce({data: blob})

            const result = await adminApi.exportWorkerBillingCsv({status: 'paid'})

            expect(mockGet).toHaveBeenCalledWith('/worker-billing/export', {params: {status: 'paid'}, responseType: 'blob'})
            expect(result).toBe(blob)
        })
    })

    describe('markWorkerBillingPaid', () => {
        it('calls PATCH /worker-billing/:id/mark-paid', async () => {
            mockPatch.mockResolvedValueOnce({data: {}})

            await adminApi.markWorkerBillingPaid(1)

            expect(mockPatch).toHaveBeenCalledWith('/worker-billing/1/mark-paid')
        })

        it('propagates errors from apiClient', async () => {
            mockPatch.mockRejectedValueOnce(new Error('Already paid'))

            await expect(adminApi.markWorkerBillingPaid(1)).rejects.toThrow('Already paid')
        })
    })

    describe('getAnalyticsOverview', () => {
        it('calls GET /admin/analytics/overview with filters', async () => {
            const overview: PlatformOverviewRead = {
                jobs_posted: 1, applications_submitted: 1, applications_accepted: 0, jobs_completed: 0,
                acceptance_rate: 0, completion_rate: 0, daily: [],
            }
            mockGet.mockResolvedValueOnce({data: overview})

            const result = await adminApi.getAnalyticsOverview({date_from: '2026-01-01T00:00:00Z'})

            expect(mockGet).toHaveBeenCalledWith('/admin/analytics/overview', {params: {date_from: '2026-01-01T00:00:00Z'}})
            expect(result).toEqual(overview)
        })
    })

    describe('getAnalyticsBreakdown', () => {
        it('calls GET /admin/analytics/breakdown with filters', async () => {
            const breakdown: PlatformBreakdownRead = {by_trade_category: [], by_location: []}
            mockGet.mockResolvedValueOnce({data: breakdown})

            const result = await adminApi.getAnalyticsBreakdown({})

            expect(mockGet).toHaveBeenCalledWith('/admin/analytics/breakdown', {params: {}})
            expect(result).toEqual(breakdown)
        })
    })

    describe('getAnalyticsFunnel', () => {
        it('calls GET /admin/analytics/funnel with filters', async () => {
            const funnel: ConversionFunnelRead = {posted: 1, applied: 1, accepted: 0, completed: 0}
            mockGet.mockResolvedValueOnce({data: funnel})

            const result = await adminApi.getAnalyticsFunnel({})

            expect(mockGet).toHaveBeenCalledWith('/admin/analytics/funnel', {params: {}})
            expect(result).toEqual(funnel)
        })
    })
    describe('flagged reviews', () => {
        it('listFlaggedReviews calls GET /admin/flagged-reviews', async () => {
            const reviews = [{id: 1, rating: 1, comment: 'bad', reviewer_name: 'A', reviewee_name: 'B', report_count: 2, created_at: '2026-01-01T00:00:00Z'}]
            mockGet.mockResolvedValue({data: reviews})

            const result = await adminApi.listFlaggedReviews()

            expect(mockGet).toHaveBeenCalledWith('/admin/flagged-reviews')
            expect(result).toEqual(reviews)
        })

        it('approveFlaggedReview calls POST /admin/flagged-reviews/:id/approve', async () => {
            mockPost.mockResolvedValue({data: undefined})

            await adminApi.approveFlaggedReview(7)

            expect(mockPost).toHaveBeenCalledWith('/admin/flagged-reviews/7/approve')
        })

        it('removeFlaggedReview calls POST /admin/flagged-reviews/:id/remove', async () => {
            mockPost.mockResolvedValue({data: undefined})

            await adminApi.removeFlaggedReview(7)

            expect(mockPost).toHaveBeenCalledWith('/admin/flagged-reviews/7/remove')
        })
    })
    describe('getNotificationStats', () => {
        it('calls GET /notifications/stats with since_hours', async () => {
            mockGet.mockResolvedValue({data: []})

            await adminApi.getNotificationStats(24)

            expect(mockGet).toHaveBeenCalledWith('/notifications/stats', {params: {since_hours: 24}})
        })
    })
})
