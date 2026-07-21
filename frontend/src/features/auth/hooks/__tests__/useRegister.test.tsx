// src/features/auth/__tests__/useRegister.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {useRegister} from '@/features/auth/hooks/useRegister'
import {authApi} from '@/lib/api/authApi'
import {toast} from 'sonner'
import {createTestQueryClient} from '@/test/renderWithProviders'
import type {ReactNode} from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/authApi', () => ({
    authApi: {register: vi.fn()},
}))

vi.mock('sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()},
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {...actual, useNavigate: () => mockNavigate}
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
    const queryClient = createTestQueryClient()
    return ({children}: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
    )
}

const validPayload = {
    name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    password: 'Secure123',
    role_type: 'worker' as const,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRegister', () => {
    beforeEach(() => vi.clearAllMocks())

    describe('initial state', () => {
        it('is idle initially', () => {
            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})
            expect(result.current.isPending).toBe(false)
            expect(result.current.isSuccess).toBe(false)
            expect(result.current.isError).toBe(false)
        })
    })

    describe('on success', () => {
        it('calls authApi.register with correct payload', async () => {
            vi.mocked(authApi.register).mockResolvedValue({
                id: 1,
                username: 'johndoe',
                email: 'john@example.com',
                role_type: 'worker',
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                await result.current.mutateAsync(validPayload)
            })

            // TanStack Query passes mutation context as second arg
            expect(authApi.register).toHaveBeenCalledWith(
                validPayload,
                expect.objectContaining({client: expect.any(QueryClient)})
            )
        })

        it('shows success toast with username', async () => {
            vi.mocked(authApi.register).mockResolvedValue({
                id: 1,
                username: 'johndoe',
                email: 'john@example.com',
                role_type: 'worker',
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                await result.current.mutateAsync(validPayload)
            })

            expect(toast.success).toHaveBeenCalledWith(
                'Account created! Welcome, johndoe.'
            )
        })

        it('navigates to /login after registration', async () => {
            vi.mocked(authApi.register).mockResolvedValue({
                id: 1,
                username: 'johndoe',
                email: 'john@example.com',
                role_type: 'worker',
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                await result.current.mutateAsync(validPayload)
            })

            expect(mockNavigate).toHaveBeenCalledWith('/login')
        })

        it('does not show error toast on success', async () => {
            vi.mocked(authApi.register).mockResolvedValue({
                id: 1,
                username: 'johndoe',
                email: 'john@example.com',
                role_type: 'worker',
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                await result.current.mutateAsync(validPayload)
            })

            expect(toast.error).not.toHaveBeenCalled()
        })
    })

    describe('on error', () => {
        it('shows string error detail from API', async () => {
            vi.mocked(authApi.register).mockRejectedValue({
                response: {data: {detail: 'Email already registered'}},
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                result.current.mutate(validPayload)
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Email already registered')
            )
        })

        it('shows each pydantic validation error separately', async () => {
            vi.mocked(authApi.register).mockRejectedValue({
                response: {
                    data: {
                        detail: [
                            {loc: ['body', 'email'], msg: 'Invalid email'},
                            {loc: ['body', 'username'], msg: 'Too short'},
                        ],
                    },
                },
            })

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                result.current.mutate(validPayload)
            })

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledTimes(2)
                expect(toast.error).toHaveBeenCalledWith('body.email — Invalid email')
                expect(toast.error).toHaveBeenCalledWith('body.username — Too short')
            })
        })

        it('shows fallback message on unknown error', async () => {
            vi.mocked(authApi.register).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                result.current.mutate(validPayload)
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith(
                    'Registration failed. Please try again.'
                )
            )
        })

        it('does not navigate on failure', async () => {
            vi.mocked(authApi.register).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                result.current.mutate(validPayload)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(mockNavigate).not.toHaveBeenCalled()
        })

        it('does not show success toast on failure', async () => {
            vi.mocked(authApi.register).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            await act(async () => {
                result.current.mutate(validPayload)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.success).not.toHaveBeenCalled()
        })
    })

    describe('mutation state', () => {
        it('is pending during registration', async () => {
            vi.mocked(authApi.register).mockImplementation(() => new Promise(() => {
            }))

            const {result} = renderHook(() => useRegister(), {wrapper: createWrapper()})

            act(() => {
                result.current.mutate(validPayload)
            })

            await waitFor(() => expect(result.current.isPending).toBe(true))
        })
    })
})