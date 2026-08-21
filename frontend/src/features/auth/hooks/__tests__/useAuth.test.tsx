// src/features/auth/__tests__/useAuth.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {Provider} from 'react-redux'
import {useAuth} from '@/features/auth/hooks/useAuth'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import {createTestQueryClient, createTestStore} from '@/test/renderWithProviders'
import type {ReactNode} from 'react'
import {getAccessToken, setAccessToken} from '@/lib/api/apiClient'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/authApi', () => ({
    authApi: {
        login: vi.fn(),
        logout: vi.fn(),
    },
}))
vi.mock('@/lib/api/apiClient', () => ({
    setAccessToken: vi.fn(),
    getAccessToken: vi.fn((): string | null => null),
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
                    <MemoryRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
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
    })

    // ─── Initial state ────────────────────────────────────────────────────────

    describe('initial state', () => {
        it('is unauthenticated by default', () => {
            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})
            expect(result.current.isAuthenticated).toBe(false)
            expect(result.current.accessToken).toBeNull()
        })

        it('is authenticated when token exists in memory', () => {
            vi.mocked(getAccessToken).mockReturnValue('existing-token')
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
            }, expect.objectContaining({client: expect.any(QueryClient)}))
        })

        it('stores access token in memory on success', async () => {
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

            expect(setAccessToken).toHaveBeenCalledWith('test-token')
        })

        it('does NOT store token in sessionStorage', async () => {
            const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
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

            expect(setItemSpy).not.toHaveBeenCalledWith('access_token', expect.anything())
            setItemSpy.mockRestore()
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

        it('shows string error detail on login failure', async () => {
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

        it('shows array error details joined on login failure', async () => {
            vi.mocked(authApi.login).mockRejectedValue({
                response: {
                    data: {
                        detail: [
                            {msg: 'Username is required'},
                            {msg: 'Password must be at least 8 characters'},
                        ],
                    },
                },
            })

            const {wrapper} = createWrapper()
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.login({
                    username_or_email: '',
                    password: 'short',
                })
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith(
                    'Username is required. Password must be at least 8 characters'
                )
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
                expect(toast.error).toHaveBeenCalledWith('Something went wrong. Please try again.')
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
            expect(setAccessToken).not.toHaveBeenCalled()
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

        it('clears access token from memory on logout', async () => {
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            expect(setAccessToken).toHaveBeenCalledWith(null)
        })

        it('does NOT use sessionStorage for token cleanup', async () => {
            const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
            vi.mocked(authApi.logout).mockResolvedValue(undefined)

            const {wrapper} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            expect(removeItemSpy).not.toHaveBeenCalled()
            removeItemSpy.mockRestore()
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

        it('clears memory token even when logout API fails', async () => {
            vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'))

            const {wrapper, store} = createWrapper(authenticatedState)
            const {result} = renderHook(() => useAuth(), {wrapper})

            await act(async () => {
                await result.current.logout()
            })

            await waitFor(() => {
                expect(setAccessToken).toHaveBeenCalledWith(null)
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