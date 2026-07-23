// src/features/auth/__tests__/useInitAuth.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {QueryClientProvider} from '@tanstack/react-query'
import {useInitAuth} from '@/features/auth/hooks/useInitAuth'
import {authApi} from '@/lib/api/authApi'
import {getAccessToken, setAccessToken} from '@/lib/api/apiClient'
import {createTestQueryClient} from '@/test/renderWithProviders'
import type {ReactNode} from 'react'
import {store} from '@/store'
import {Provider} from "react-redux";
// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/authApi', () => ({
    authApi: {
        refresh: vi.fn(),
    },
}))

vi.mock('@/lib/api/apiClient', () => ({
    setAccessToken: vi.fn(),
    getAccessToken: vi.fn(() => null),
}))

const mockNavigate = vi.fn()
const mockLogout = vi.fn()

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: () => ({logout: mockLogout}),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createWrapper = () => {
    const queryClient = createTestQueryClient()
    return ({children}: { children: ReactNode }) => (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>{children}</MemoryRouter>
            </QueryClientProvider>
        </Provider>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useInitAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('when access token already exists in memory', () => {
        it('does not call refresh', async () => {
            vi.mocked(getAccessToken).mockReturnValue('existing-token')

            renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() =>
                expect(authApi.refresh).not.toHaveBeenCalled()
            )
        })

        it('returns isLoading false', async () => {
            vi.mocked(getAccessToken).mockReturnValue('existing-token')

            const {result} = renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() => expect(result.current.isLoading).toBe(false))
        })
    })

    describe('when no access token in memory', () => {
        it('calls authApi.refresh', async () => {
            vi.mocked(getAccessToken).mockReturnValue(null)
            vi.mocked(authApi.refresh).mockResolvedValue({
                access_token: 'new-token',
            })

            renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() => expect(authApi.refresh).toHaveBeenCalledTimes(1))
        })

        it('stores new access token in memory on successful refresh', async () => {
            vi.mocked(getAccessToken).mockReturnValue(null)
            vi.mocked(authApi.refresh).mockResolvedValue({
                access_token: 'new-token',
            })

            renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() =>
                expect(setAccessToken).toHaveBeenCalledWith('new-token')
            )
        })

        it('returns isLoading false after successful refresh', async () => {
            vi.mocked(getAccessToken).mockReturnValue(null)
            vi.mocked(authApi.refresh).mockResolvedValue({
                access_token: 'new-token',
            })

            const {result} = renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() => expect(result.current.isLoading).toBe(false))
        })

        it('does not store token on refresh failure', async () => {
            vi.mocked(getAccessToken).mockReturnValue(null)
            vi.mocked(authApi.refresh).mockRejectedValue(new Error('Invalid refresh token'))

            renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            await waitFor(() => {
                expect(setAccessToken).not.toHaveBeenCalled()
            })
        })
    })

    describe('loading state', () => {
        it('returns isLoading true while refreshing', async () => {
            vi.mocked(getAccessToken).mockReturnValue(null)
            vi.mocked(authApi.refresh).mockImplementation(
                () => new Promise(() => {
                }) // never resolves
            )

            const {result} = renderHook(() => useInitAuth(), {wrapper: createWrapper()})

            expect(result.current.isLoading).toBe(true)
        })
    })
})