// src/features/auth/__tests__/useAuth.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {Provider} from 'react-redux'
import {useAuth} from '@/features/auth/hooks/useAuth'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import {createTestQueryClient, createTestStore} from '@/test/renderWithProviders'
import type {ReactNode} from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/authApi', () => ({
    authApi: {
        login: vi.fn(),
        logout: vi.fn(),
    },
}))

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = (preloadedState = {}) => {
    const store = createTestStore(preloadedState)
    const queryClient = createTestQueryClient()

    return {
        store,
        wrapper: ({children}: { children: ReactNode }) => (
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter>
                        {children}
                    </MemoryRouter>
                </QueryClientProvider>
            </Provider>
        ),
    }
}


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        sessionStorage.clear()
    })

    // ─── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('is unauthenticated by default', () => {
            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isAuthenticated).toBe(false)
            expect(result.current.accessToken).toBeNull()
        })

        it('is authenticated when token exists in sessionStorage', () => {
            sessionStorage.setItem('access_token', 'existing-token')
            const {wrapper} = createWrapper({
                auth: {
                    accessToken: 'existing-token',
                    isAuthenticated: true,
                    isLoading: false,
                },
            })
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isAuthenticated).toBe(true)
            expect(result.current.accessToken).toBe('existing-token')
        })

        it('is not loading initially', () => {
            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isLoading).toBe(false)
        })

        it('is not logging in initially', () => {
            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isLoggingIn).toBe(false)
        })

        it('is not logging out initially', () => {
            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isLoggingOut).toBe(false)
        })
    })

    // ─── Login ────────────────────────────────────────────────────────────────

    describe('login', () => {
        it('calls authApi.login with correct payload', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'bearer',
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            })

            expect(authApi.login).toHaveBeenCalledWith({
                username_or_email: 'johndoe',
                password: 'Pass123',
            })
        })

        it('stores access token in sessionStorage on success', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'bearer',
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            })

            await waitFor(() =>
                expect(sessionStorage.getItem('access_token')).toBe('test-token')
            )
        })

        it('updates isAuthenticated to true on success', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'bearer',
            })

            const {wrapper, store} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            })

            await waitFor(() =>
                expect(store.getState().auth.isAuthenticated).toBe(true)
            )
        })

        it('navigates to /dashboard on success', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'bearer',
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            })

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
            )
        })

        it('shows success toast on login', async () => {
            vi.mocked(authApi.login).mockResolvedValue({
                access_token: 'test-token',
                token_type: 'bearer',
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            })

            await waitFor(() =>
                expect(toast.success).toHaveBeenCalledWith('Welcome back!')
            )
        })

        it('shows error toast on login failure', async () => {
            vi.mocked(authApi.login).mockRejectedValue({
                response: {data: {detail: 'Invalid credentials'}},
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'wrongpass',
                })
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Invalid credentials')
            )
        })

        it('shows fallback error message when no detail in response', async () => {
            vi.mocked(authApi.login).mockRejectedValue(new Error('Network error'))

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'wrongpass',
                })
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Login failed. Please try again.')
            )
        })

        it('does not navigate on login failure', async () => {
            vi.mocked(authApi.login).mockRejectedValue(new Error('Network error'))

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'wrongpass',
                })
            })

            await waitFor(() => expect(result.current.isLoggingIn).toBe(false))
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it('does not store token on login failure', async () => {
            vi.mocked(authApi.login).mockRejectedValue(new Error('Network error'))

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: 'johndoe',
                    password: 'wrongpass',
                })
            })

            await waitFor(() => expect(result.current.isLoggingIn).toBe(false))
            expect(sessionStorage.getItem('access_token')).toBeNull()
        })
    })

    // ─── Logout ───────────────────────────────────────────────────────────────

    describe('logout', () => {
        const authenticatedState = {
            auth: {
                accessToken: 'test-token',
                isAuthenticated: true,
                isLoading: false,
            },
        }

        it('calls authApi.logout', async () => {
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            expect(authApi.logout).toHaveBeenCalledTimes(1)
        })

        it('clears sessionStorage on logout', async () => {
            sessionStorage.setItem('access_token', 'test-token')
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() =>
                expect(sessionStorage.getItem('access_token')).toBeNull()
            )
        })

        it('clears auth state on logout', async () => {
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper, store} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() => {
                expect(store.getState().auth.isAuthenticated).toBe(false)
                expect(store.getState().auth.accessToken).toBeNull()
            })
        })

        it('navigates to /login on logout', async () => {
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('/login')
            )
        })

        it('clears session even when logout API fails', async () => {
            sessionStorage.setItem('access_token', 'test-token')
            vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))

            const {wrapper, store} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() => {
                expect(sessionStorage.getItem('access_token')).toBeNull()
                expect(store.getState().auth.isAuthenticated).toBe(false)
            })
        })

        it('shows error toast when logout API fails', async () => {
            vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith(
                    'Logout failed — cleared local session anyway.'
                )
            )
        })

        it('still navigates to /login even when logout API fails', async () => {
            vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() =>
                expect(mockNavigate).toHaveBeenCalledWith('/login')
            )
        })
    })
})