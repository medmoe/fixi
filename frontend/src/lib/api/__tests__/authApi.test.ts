import {beforeEach, describe, expect, it, vi} from 'vitest'
import {authApi} from '../authApi'
import apiClient from '../apiClient'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../apiClient', () => ({
    default: {
        post: vi.fn(),
    },
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockRegisterPayload = {
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    password: 'Password123!',
    role_type: 'worker' as const,
}

const mockLoginPayload = {
    username_or_email: 'john_doe',
    password: 'Password123!',
}

const mockRegisterResponse = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    role_type: 'worker',
}

const mockLoginResponse = {
    access_token: 'jwt-access-token-123',
    user: mockRegisterResponse,
}

const mockRefreshResponse = {
    access_token: 'new-jwt-access-token-456',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPost = vi.mocked(apiClient.post)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authApi', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── register ───────────────────────────────────────────────────────────────

    describe('register', () => {
        it('calls POST /auth/register with payload', async () => {
            mockPost.mockResolvedValueOnce({data: mockRegisterResponse})
            await authApi.register(mockRegisterPayload)
            expect(mockPost).toHaveBeenCalledWith('/auth/register', mockRegisterPayload)
        })

        it('returns response data', async () => {
            mockPost.mockResolvedValueOnce({data: mockRegisterResponse})
            const result = await authApi.register(mockRegisterPayload)
            expect(result).toEqual(mockRegisterResponse)
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Username already taken')
            mockPost.mockRejectedValueOnce(error)
            await expect(authApi.register(mockRegisterPayload)).rejects.toThrow('Username already taken')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: mockRegisterResponse})
            await authApi.register(mockRegisterPayload)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── login ──────────────────────────────────────────────────────────────────

    describe('login', () => {
        it('calls POST /auth/login with payload', async () => {
            mockPost.mockResolvedValueOnce({data: mockLoginResponse})
            await authApi.login(mockLoginPayload)
            expect(mockPost).toHaveBeenCalledWith('/auth/login', mockLoginPayload)
        })

        it('returns access token and user data', async () => {
            mockPost.mockResolvedValueOnce({data: mockLoginResponse})
            const result = await authApi.login(mockLoginPayload)
            expect(result).toEqual(mockLoginResponse)
            expect(result.access_token).toBe('jwt-access-token-123')
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Invalid credentials')
            mockPost.mockRejectedValueOnce(error)
            await expect(authApi.login(mockLoginPayload)).rejects.toThrow('Invalid credentials')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: mockLoginResponse})
            await authApi.login(mockLoginPayload)
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── logout ─────────────────────────────────────────────────────────────────

    describe('logout', () => {
        it('calls POST /auth/logout', async () => {
            mockPost.mockResolvedValueOnce({data: undefined})
            await authApi.logout()
            expect(mockPost).toHaveBeenCalledWith('/auth/logout')
        })

        it('returns undefined on success', async () => {
            mockPost.mockResolvedValueOnce({data: undefined})
            const result = await authApi.logout()
            expect(result).toBeUndefined()
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Session expired')
            mockPost.mockRejectedValueOnce(error)
            await expect(authApi.logout()).rejects.toThrow('Session expired')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: undefined})
            await authApi.logout()
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── refresh ────────────────────────────────────────────────────────────────

    describe('refresh', () => {
        it('calls POST /auth/refresh', async () => {
            mockPost.mockResolvedValueOnce({data: mockRefreshResponse})
            await authApi.refresh()
            expect(mockPost).toHaveBeenCalledWith('/auth/refresh')
        })

        it('returns new access token', async () => {
            mockPost.mockResolvedValueOnce({data: mockRefreshResponse})
            const result = await authApi.refresh()
            expect(result).toEqual(mockRefreshResponse)
            expect(result.access_token).toBe('new-jwt-access-token-456')
        })

        it('propagates errors from apiClient', async () => {
            const error = new Error('Refresh token expired')
            mockPost.mockRejectedValueOnce(error)
            await expect(authApi.refresh()).rejects.toThrow('Refresh token expired')
        })

        it('calls apiClient.post exactly once', async () => {
            mockPost.mockResolvedValueOnce({data: mockRefreshResponse})
            await authApi.refresh()
            expect(mockPost).toHaveBeenCalledTimes(1)
        })
    })

    // ─── Full auth flow ─────────────────────────────────────────────────────────

    describe('full auth flow', () => {
        it('can register, login, refresh, and logout in sequence', async () => {
            mockPost
                .mockResolvedValueOnce({data: mockRegisterResponse})
                .mockResolvedValueOnce({data: mockLoginResponse})
                .mockResolvedValueOnce({data: mockRefreshResponse})
                .mockResolvedValueOnce({data: undefined})

            const registerResult = await authApi.register(mockRegisterPayload)
            expect(registerResult.username).toBe('john_doe')

            const loginResult = await authApi.login(mockLoginPayload)
            expect(loginResult.access_token).toBe('jwt-access-token-123')

            const refreshResult = await authApi.refresh()
            expect(refreshResult.access_token).toBe('new-jwt-access-token-456')

            await authApi.logout()
            expect(mockPost).toHaveBeenLastCalledWith('/auth/logout')
        })
    })
})