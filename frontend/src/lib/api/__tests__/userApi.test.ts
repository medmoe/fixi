import {beforeEach, describe, expect, it, vi} from 'vitest'
import {userApi} from '../userApi'
import apiClient from '../apiClient'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../apiClient', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    location: 'New York, NY',
    profile_image_url: 'https://example.com/image.jpg',
    role_type: 'worker',
}

const mockUpdatePayload = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    location: 'Los Angeles, CA',
}

const mockPasswordPayload = {
    current_password: 'oldPass123!',
    new_password: 'NewPass1!',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockGet = vi.mocked(apiClient.get)
const mockPatch = vi.mocked(apiClient.patch)
const mockDelete = vi.mocked(apiClient.delete)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('userApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── me ─────────────────────────────────────────────────────────────────────

    describe('me', () => {
        it('calls GET /user/me', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            await userApi.me()
            expect(mockGet).toHaveBeenCalledWith('/user/me')
        })

        it('returns current user data', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            const result = await userApi.me()
            expect(result).toEqual(mockUser)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Unauthorized')
            mockGet.mockRejectedValueOnce(error)
            await expect(userApi.me()).rejects.toThrow('Unauthorized')
        })

        it('calls apiClient.get exactly once', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            await userApi.me()
            expect(mockGet).toHaveBeenCalledTimes(1)
        })
    })

    // ─── getUser ────────────────────────────────────────────────────────────────

    describe('getUser', () => {
        it('calls GET /user/:username', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            await userApi.getUser('john_doe')
            expect(mockGet).toHaveBeenCalledWith('/user/john_doe')
        })

        it('returns user data for given username', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            const result = await userApi.getUser('john_doe')
            expect(result).toEqual(mockUser)
            expect(result.username).toBe('john_doe')
        })

        it('handles different usernames', async () => {
            mockGet.mockResolvedValueOnce({data: {...mockUser, username: 'jane_doe'}})
            const result = await userApi.getUser('jane_doe')
            expect(mockGet).toHaveBeenCalledWith('/user/jane_doe')
            expect(result.username).toBe('jane_doe')
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('User not found')
            mockGet.mockRejectedValueOnce(error)
            await expect(userApi.getUser('unknown')).rejects.toThrow('User not found')
        })

        it('calls apiClient.get exactly once', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            await userApi.getUser('john_doe')
            expect(mockGet).toHaveBeenCalledTimes(1)
        })
    })

    // ─── updateUser ─────────────────────────────────────────────────────────────

    describe('updateUser', () => {
        it('calls PATCH /user/:username with payload', async () => {
            mockPatch.mockResolvedValueOnce({data: {...mockUser, ...mockUpdatePayload}})
            await userApi.updateUser('john_doe', mockUpdatePayload)
            expect(mockPatch).toHaveBeenCalledWith('/user/john_doe', mockUpdatePayload)
        })

        it('returns updated user data', async () => {
            const updatedUser = {...mockUser, ...mockUpdatePayload}
            mockPatch.mockResolvedValueOnce({data: updatedUser})
            const result = await userApi.updateUser('john_doe', mockUpdatePayload)
            expect(result.name).toBe('Jane Doe')
            expect(result.email).toBe('jane@example.com')
        })

        it('handles partial updates', async () => {
            const partialPayload = {name: 'Updated Name'}
            mockPatch.mockResolvedValueOnce({data: {...mockUser, ...partialPayload}})
            await userApi.updateUser('john_doe', partialPayload)
            expect(mockPatch).toHaveBeenCalledWith('/user/john_doe', partialPayload)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Username already taken')
            mockPatch.mockRejectedValueOnce(error)
            await expect(userApi.updateUser('john_doe', mockUpdatePayload)).rejects.toThrow('Username already taken')
        })

        it('calls apiClient.patch exactly once', async () => {
            mockPatch.mockResolvedValueOnce({data: mockUser})
            await userApi.updateUser('john_doe', mockUpdatePayload)
            expect(mockPatch).toHaveBeenCalledTimes(1)
        })
    })

    // ─── deleteUser ─────────────────────────────────────────────────────────────

    describe('deleteUser', () => {
        it('calls DELETE /user/:username', async () => {
            mockDelete.mockResolvedValueOnce({data: undefined})
            await userApi.deleteUser('john_doe')
            expect(mockDelete).toHaveBeenCalledWith('/user/john_doe')
        })

        it('returns undefined on success', async () => {
            mockDelete.mockResolvedValueOnce({data: undefined})
            const result = await userApi.deleteUser('john_doe')
            expect(result).toBeUndefined()
        })

        it('handles different usernames', async () => {
            mockDelete.mockResolvedValueOnce({data: undefined})
            await userApi.deleteUser('jane_doe')
            expect(mockDelete).toHaveBeenCalledWith('/user/jane_doe')
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Cannot delete account with pending jobs')
            mockDelete.mockRejectedValueOnce(error)
            await expect(userApi.deleteUser('john_doe')).rejects.toThrow('Cannot delete account with pending jobs')
        })

        it('calls apiClient.delete exactly once', async () => {
            mockDelete.mockResolvedValueOnce({data: undefined})
            await userApi.deleteUser('john_doe')
            expect(mockDelete).toHaveBeenCalledTimes(1)
        })
    })

    // ─── changePassword ─────────────────────────────────────────────────────────

    describe('changePassword', () => {
        it('calls PATCH /user/:username/password with payload', async () => {
            mockPatch.mockResolvedValueOnce({data: undefined})
            await userApi.changePassword('john_doe', mockPasswordPayload)
            expect(mockPatch).toHaveBeenCalledWith('/user/john_doe/password', mockPasswordPayload)
        })

        it('returns undefined on success', async () => {
            mockPatch.mockResolvedValueOnce({data: undefined})
            const result = await userApi.changePassword('john_doe', mockPasswordPayload)
            expect(result).toBeUndefined()
        })

        it('handles different usernames', async () => {
            mockPatch.mockResolvedValueOnce({data: undefined})
            await userApi.changePassword('jane_doe', mockPasswordPayload)
            expect(mockPatch).toHaveBeenCalledWith('/user/jane_doe/password', mockPasswordPayload)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Current password is incorrect')
            mockPatch.mockRejectedValueOnce(error)
            await expect(userApi.changePassword('john_doe', mockPasswordPayload)).rejects.toThrow('Current password is incorrect')
        })

        it('calls apiClient.patch exactly once', async () => {
            mockPatch.mockResolvedValueOnce({data: undefined})
            await userApi.changePassword('john_doe', mockPasswordPayload)
            expect(mockPatch).toHaveBeenCalledTimes(1)
        })
    })

    // ─── Full user flow ─────────────────────────────────────────────────────────

    describe('full user flow', () => {
        it('can fetch, update, change password, and delete in sequence', async () => {
            mockGet.mockResolvedValueOnce({data: mockUser})
            mockPatch.mockResolvedValueOnce({data: {...mockUser, name: 'Updated'}})
            mockPatch.mockResolvedValueOnce({data: undefined})
            mockDelete.mockResolvedValueOnce({data: undefined})

            const user = await userApi.me()
            expect(user.username).toBe('john_doe')

            const updated = await userApi.updateUser('john_doe', {name: 'Updated'})
            expect(updated.name).toBe('Updated')

            await userApi.changePassword('john_doe', mockPasswordPayload)
            expect(mockPatch).toHaveBeenLastCalledWith('/user/john_doe/password', mockPasswordPayload)

            await userApi.deleteUser('john_doe')
            expect(mockDelete).toHaveBeenLastCalledWith('/user/john_doe')
        })
    })
})