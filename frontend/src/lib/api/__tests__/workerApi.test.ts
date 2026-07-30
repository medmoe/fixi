import {beforeEach, describe, expect, it, vi} from 'vitest'
import {workerApi} from '../workerApi'
import apiClient from '../apiClient'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../apiClient', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile = {
    id: 1,
    bio: 'Experienced plumber',
    hourly_rate: 75.00,
    service_radius_km: 20,
    is_available: true,
    is_verified: false,
    available_since: null,
    trades: [{trade_id: 1, skill_level: 'junior' as const}],
}

const mockUpdatePayload = {
    bio: 'Updated bio',
    hourly_rate: 80.00,
    service_radius_km: 25,
    trades: [{trade_id: 1, skill_level: 'senior' as const}],
}

const mockTradeCategories = [
    {id: 1, name: 'Plumbing', description: 'Plumbing services'},
    {id: 2, name: 'Electrical', description: 'Electrical services'},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPost = vi.mocked(apiClient.post)
const mockGet = vi.mocked(apiClient.get)
const mockPatch = vi.mocked(apiClient.patch)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('workerApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── createWorkerProfile ────────────────────────────────────────────────────

    describe('createWorkerProfile', () => {
        it('calls POST /worker-profile with payload', async () => {
            mockPost.mockResolvedValueOnce({data: mockProfile})
            await workerApi.createWorkerProfile(mockUpdatePayload)
            expect(mockPost).toHaveBeenCalledWith('/worker-profile', mockUpdatePayload)
        })

        it('returns created profile data', async () => {
            mockPost.mockResolvedValueOnce({data: mockProfile})
            const result = await workerApi.createWorkerProfile(mockUpdatePayload)
            expect(result).toEqual(mockProfile)
            expect(result.id).toBe(1)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Profile already exists')
            mockPost.mockRejectedValueOnce(error)
            await expect(workerApi.createWorkerProfile(mockUpdatePayload)).rejects.toThrow('Profile already exists')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: mockProfile})
            await workerApi.createWorkerProfile(mockUpdatePayload)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── getWorkerProfile ───────────────────────────────────────────────────────

    describe('getWorkerProfile', () => {
        it('calls GET /worker-profile', async () => {
            mockGet.mockResolvedValueOnce({data: mockProfile})
            await workerApi.getWorkerProfile()
            expect(mockGet).toHaveBeenCalledWith('/worker-profile')
        })

        it('returns worker profile data', async () => {
            mockGet.mockResolvedValueOnce({data: mockProfile})
            const result = await workerApi.getWorkerProfile()
            expect(result).toEqual(mockProfile)
            expect(result.bio).toBe('Experienced plumber')
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Profile not found')
            mockGet.mockRejectedValueOnce(error)
            await expect(workerApi.getWorkerProfile()).rejects.toThrow('Profile not found')
        })

        it('calls apiClient.get exactly once', async () => {
            mockGet.mockResolvedValueOnce({data: mockProfile})
            await workerApi.getWorkerProfile()
            expect(mockGet).toHaveBeenCalledTimes(1)
        })
    })

    // ─── updateWorkerProfile ────────────────────────────────────────────────────

    describe('updateWorkerProfile', () => {
        it('calls PATCH /worker-profile with payload', async () => {
            mockPatch.mockResolvedValueOnce({data: {...mockProfile, ...mockUpdatePayload}})
            await workerApi.updateWorkerProfile(mockUpdatePayload)
            expect(mockPatch).toHaveBeenCalledWith('/worker-profile', mockUpdatePayload)
        })

        it('returns updated profile data', async () => {
            const updatedProfile = {...mockProfile, ...mockUpdatePayload}
            mockPatch.mockResolvedValueOnce({data: updatedProfile})
            const result = await workerApi.updateWorkerProfile(mockUpdatePayload)
            expect(result.bio).toBe('Updated bio')
            expect(result.hourly_rate).toBe(80.00)
        })

        it('handles partial updates', async () => {
            const partialPayload = {bio: 'Partial update'}
            mockPatch.mockResolvedValueOnce({data: {...mockProfile, ...partialPayload}})
            await workerApi.updateWorkerProfile(partialPayload)
            expect(mockPatch).toHaveBeenCalledWith('/worker-profile', partialPayload)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Invalid trade selection')
            mockPatch.mockRejectedValueOnce(error)
            await expect(workerApi.updateWorkerProfile(mockUpdatePayload)).rejects.toThrow('Invalid trade selection')
        })

        it('calls apiClient.patch exactly once', async () => {
            mockPatch.mockResolvedValueOnce({data: mockProfile})
            await workerApi.updateWorkerProfile(mockUpdatePayload)
            expect(mockPatch).toHaveBeenCalledTimes(1)
        })
    })

    // ─── toggleAvailability ─────────────────────────────────────────────────────

    describe('toggleAvailability', () => {
        it('calls PATCH /worker-profile/availability with is_available true', async () => {
            mockPatch.mockResolvedValueOnce({data: {is_available: true, available_since: '2024-01-01T00:00:00Z'}})
            await workerApi.toggleAvailability(true)
            expect(mockPatch).toHaveBeenCalledWith('/worker-profile/availability', {is_available: true})
        })

        it('calls PATCH /worker-profile/availability with is_available false', async () => {
            mockPatch.mockResolvedValueOnce({data: {is_available: false, available_since: null}})
            await workerApi.toggleAvailability(false)
            expect(mockPatch).toHaveBeenCalledWith('/worker-profile/availability', {is_available: false})
        })

        it('returns availability status and timestamp when available', async () => {
            mockPatch.mockResolvedValueOnce({data: {is_available: true, available_since: '2024-01-01T00:00:00Z'}})
            const result = await workerApi.toggleAvailability(true)
            expect(result.is_available).toBe(true)
            expect(result.available_since).toBe('2024-01-01T00:00:00Z')
        })

        it('returns null available_since when not available', async () => {
            mockPatch.mockResolvedValueOnce({data: {is_available: false, available_since: null}})
            const result = await workerApi.toggleAvailability(false)
            expect(result.is_available).toBe(false)
            expect(result.available_since).toBeNull()
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Failed to update availability')
            mockPatch.mockRejectedValueOnce(error)
            await expect(workerApi.toggleAvailability(true)).rejects.toThrow('Failed to update availability')
        })

        it('calls apiClient.patch exactly once', async () => {
            mockPatch.mockResolvedValueOnce({data: {is_available: true, available_since: null}})
            await workerApi.toggleAvailability(true)
            expect(mockPatch).toHaveBeenCalledTimes(1)
        })
    })

    // ─── uploadAvatar ───────────────────────────────────────────────────────────

    describe('uploadAvatar', () => {
        const mockFile = new File(['avatar-image'], 'avatar.jpg', {type: 'image/jpeg'})

        it('calls POST /worker-profile/avatar with FormData', async () => {
            mockPost.mockResolvedValueOnce({data: {avatar_url: 'https://example.com/avatar.jpg'}})
            await workerApi.uploadAvatar(mockFile)
            expect(mockPost).toHaveBeenCalledWith(
                '/worker-profile/avatar',
                expect.any(FormData),
                {headers: {'Content-Type': 'multipart/form-data'}}
            )
        })

        it('returns avatar URL on success', async () => {
            mockPost.mockResolvedValueOnce({data: {avatar_url: 'https://example.com/avatar.jpg'}})
            const result = await workerApi.uploadAvatar(mockFile)
            expect(result.avatar_url).toBe('https://example.com/avatar.jpg')
        })

        it('sends correct Content-Type header', async () => {
            mockPost.mockResolvedValueOnce({data: {avatar_url: 'https://example.com/avatar.jpg'}})
            await workerApi.uploadAvatar(mockFile)
            const [, , config] = mockPost.mock.calls[0]
            expect(config).toEqual({headers: {'Content-Type': 'multipart/form-data'}})
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Invalid image format')
            mockPost.mockRejectedValueOnce(error)
            await expect(workerApi.uploadAvatar(mockFile)).rejects.toThrow('Invalid image format')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: {avatar_url: 'https://example.com/avatar.jpg'}})
            await workerApi.uploadAvatar(mockFile)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── getTrades ──────────────────────────────────────────────────────────────

    describe('getTrades', () => {
        it('calls GET /trade-categories', async () => {
            mockGet.mockResolvedValueOnce({data: mockTradeCategories})
            await workerApi.getTrades()
            expect(mockGet).toHaveBeenCalledWith('/trade-categories')
        })

        it('returns array of trade categories', async () => {
            mockGet.mockResolvedValueOnce({data: mockTradeCategories})
            const result = await workerApi.getTrades()
            expect(result).toEqual(mockTradeCategories)
            expect(result).toHaveLength(2)
        })

        it('returns empty array when no trades exist', async () => {
            mockGet.mockResolvedValueOnce({data: []})
            const result = await workerApi.getTrades()
            expect(result).toEqual([])
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Failed to fetch trades')
            mockGet.mockRejectedValueOnce(error)
            await expect(workerApi.getTrades()).rejects.toThrow('Failed to fetch trades')
        })

        it('calls apiClient.get exactly once', async () => {
            mockGet.mockResolvedValueOnce({data: mockTradeCategories})
            await workerApi.getTrades()
            expect(mockGet).toHaveBeenCalledTimes(1)
        })
    })

    // ─── Full worker flow ───────────────────────────────────────────────────────

    describe('full worker flow', () => {
        it('can create, fetch, update, toggle availability, and upload avatar in sequence', async () => {
            mockPost.mockResolvedValueOnce({data: mockProfile})
            mockGet.mockResolvedValueOnce({data: mockProfile})
            mockPatch.mockResolvedValueOnce({data: {...mockProfile, bio: 'Updated'}})
            mockPatch.mockResolvedValueOnce({data: {is_available: false, available_since: null}})
            mockPost.mockResolvedValueOnce({data: {avatar_url: 'https://example.com/avatar.jpg'}})

            const created = await workerApi.createWorkerProfile(mockUpdatePayload)
            expect(created.id).toBe(1)

            const fetched = await workerApi.getWorkerProfile()
            expect(fetched.bio).toBe('Experienced plumber')

            const updated = await workerApi.updateWorkerProfile({bio: 'Updated'})
            expect(updated.bio).toBe('Updated')

            const availability = await workerApi.toggleAvailability(false)
            expect(availability.is_available).toBe(false)

            const file = new File(['img'], 'avatar.jpg', {type: 'image/jpeg'})
            const avatar = await workerApi.uploadAvatar(file)
            expect(avatar.avatar_url).toBe('https://example.com/avatar.jpg')
        })
    })
})