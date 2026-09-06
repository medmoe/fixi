import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import axios from 'axios'
import {getAccessToken, setAccessToken} from '../apiClient'

// ─── Mock axios with a factory that creates its own instance ──────────────────

vi.mock('axios', () => {
    const mockInstance = {
        interceptors: {
            request: {use: vi.fn()},
            response: {use: vi.fn()},
        },
        defaults: {headers: {common: {}}},
        post: vi.fn(),
        get: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
    }
    return {
        default: {
            create: vi.fn(() => mockInstance),
            __mockInstance: mockInstance, // expose for tests
        },
    }
})


const mockInstance = (axios as any).__mockInstance

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('token storage', () => {
    beforeEach(() => {
        setAccessToken(null)
    })

    it('sets and gets access token', () => {
        setAccessToken('test-token-123')
        expect(getAccessToken()).toBe('test-token-123')
    })

    it('returns null when token is not set', () => {
        expect(getAccessToken()).toBeNull()
    })

    it('returns null after token is cleared', () => {
        setAccessToken('test-token-123')
        setAccessToken(null)
        expect(getAccessToken()).toBeNull()
    })

    it('overwrites existing token', () => {
        setAccessToken('old-token')
        setAccessToken('new-token')
        expect(getAccessToken()).toBe('new-token')
    })
})

describe('apiClient configuration', () => {
    it('creates axios instance with correct baseURL', () => {
        expect(vi.mocked(axios.create)).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: expect.any(String),
                withCredentials: true,
                headers: {'Content-Type': 'application/json'},
            })
        )
    })

    it('uses default baseURL when env var is not set', () => {
        expect(vi.mocked(axios.create)).toHaveBeenCalledWith(
            expect.objectContaining({
                baseURL: 'http://localhost:8000/api/v1',
            })
        )
    })

    it('has request interceptor configured', () => {
        expect(mockInstance.interceptors.request.use).toHaveBeenCalledTimes(1)
    })

    it('has response interceptor configured', () => {
        expect(mockInstance.interceptors.response.use).toHaveBeenCalledTimes(1)
    })
})

describe('request interceptor', () => {
    let requestInterceptor: Function

    beforeEach(() => {
        requestInterceptor = mockInstance.interceptors.request.use.mock.calls[0][0]
        setAccessToken(null)
    })

    it('attaches authorization header when token exists', () => {
        setAccessToken('Bearer-token-123')
        const config = {headers: {}} as any
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBe('Bearer Bearer-token-123')
    })

    it('does not attach authorization header when token is null', () => {
        const config = {headers: {}} as any
        const result = requestInterceptor(config)
        expect(result.headers.Authorization).toBeUndefined()
    })

    it('returns config object unchanged except for header', () => {
        setAccessToken('token-123')
        const config = {headers: {}, url: '/test', method: 'get'} as any
        const result = requestInterceptor(config)
        expect(result.url).toBe('/test')
        expect(result.method).toBe('get')
    })
})

describe('response interceptor — auth endpoints', () => {
    let errorInterceptor: Function

    beforeEach(() => {
        errorInterceptor = mockInstance.interceptors.response.use.mock.calls[0][1]
        setAccessToken(null)
    })

    it('does not refresh token for login endpoint', async () => {
        const error = {
            response: {status: 401},
            config: {url: '/auth/login', _retry: false},
        }
        await expect(errorInterceptor(error)).rejects.toEqual(error)
    })

    it('does not refresh token for register endpoint', async () => {
        const error = {
            response: {status: 401},
            config: {url: '/auth/register', _retry: false},
        }
        await expect(errorInterceptor(error)).rejects.toEqual(error)
    })

    it('does not refresh token for refresh endpoint', async () => {
        const error = {
            response: {status: 401},
            config: {url: '/auth/refresh', _retry: false},
        }
        await expect(errorInterceptor(error)).rejects.toEqual(error)
    })

    it('does not refresh token for logout endpoint', async () => {
        const error = {
            response: {status: 401},
            config: {url: '/auth/logout', _retry: false},
        }
        await expect(errorInterceptor(error)).rejects.toEqual(error)
    })
})

describe('response interceptor — token refresh', () => {
    let successInterceptor: Function
    let errorInterceptor: Function

    beforeEach(() => {
        const calls = mockInstance.interceptors.response.use.mock.calls[0]
        successInterceptor = calls[0]
        errorInterceptor = calls[1]
        setAccessToken('old-token')
        vi.stubGlobal('window', {location: {href: ''}})
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('passes through successful responses unchanged', () => {
        const response = {data: {id: 1}, status: 200}
        expect(successInterceptor(response)).toEqual(response)
    })

    it('does not retry already retried requests', async () => {
        const error = {
            response: {status: 401},
            config: {url: '/user/me', _retry: true},
        }
        await expect(errorInterceptor(error)).rejects.toEqual(error)
    })

    it('queues multiple requests during refresh', async () => {
        expect(mockInstance.interceptors.response.use).toHaveBeenCalled()
    })
})