// src/components/__tests__/AuthInitializer.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom'
import {AuthInitializer} from '@/features/auth/components/AuthInitializer'
import {useInitAuth} from '@/features/auth/hooks/useInitAuth'
import {useNotificationSocket} from '@/features/notification'
import {useLanguageSync} from '@/features/i18n'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth/hooks/useInitAuth', () => ({
    useInitAuth: vi.fn(),
}))

vi.mock('@/features/notification', () => ({
    useNotificationSocket: vi.fn(),
}))

vi.mock('@/features/i18n', () => ({
    useLanguageSync: vi.fn(),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LocationDisplay = () => {
    const location = useLocation()
    return <div data-testid="location-display">{location.pathname}</div>
}

const TestOutlet = () => <div data-testid="outlet-content">Outlet Content</div>

const renderWithRouter = (
    {
        initialRoute = '/',
        authState = {isLoading: true, isAuthenticated: false, isError: false},
    }: {
        initialRoute?: string
        authState?: { isLoading: boolean; isAuthenticated: boolean, isError: boolean }
    } = {}
) => {
    vi.mocked(useInitAuth).mockReturnValue(authState)

    return render(
        <MemoryRouter initialEntries={[initialRoute]} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Routes>
                <Route element={<AuthInitializer/>}>
                    <Route path="/" element={<TestOutlet/>}/>
                    <Route path="/login" element={<div data-testid="login-page">Login</div>}/>
                    <Route path="/register" element={<div data-testid="register-page">Register</div>}/>
                    <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>}/>
                    <Route path="*" element={<LocationDisplay/>}/>
                </Route>
            </Routes>
        </MemoryRouter>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthInitializer', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── Loading state ────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading spinner when auth is initializing', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: true, isAuthenticated: false, isError: false},
            })
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
            expect(screen.getByText('Loading...')).toBeInTheDocument()
        })

        it('does not render outlet when loading', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: true, isAuthenticated: false, isError: false},
            })
            expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument()
        })

        it('does not redirect when loading', () => {
            renderWithRouter({
                initialRoute: '/login',
                authState: {isLoading: true, isAuthenticated: true, isError: false},
            })
            expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })
    })

    // ─── Public routes ────────────────────────────────────────────────────────────

    describe('public routes', () => {
        it('renders outlet on landing page when not authenticated', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: false, isAuthenticated: false, isError: false},
            })
            expect(screen.getByTestId('outlet-content')).toBeInTheDocument()
        })

        it('renders login page when not authenticated', () => {
            renderWithRouter({
                initialRoute: '/login',
                authState: {isLoading: false, isAuthenticated: false, isError: false},
            })
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
        })

        it('renders register page when not authenticated', () => {
            renderWithRouter({
                initialRoute: '/register',
                authState: {isLoading: false, isAuthenticated: false, isError: false},
            })
            expect(screen.getByTestId('register-page')).toBeInTheDocument()
        })
    })

    // ─── Authenticated redirects ──────────────────────────────────────────────────

    describe('authenticated redirects', () => {
        it('redirects from landing to dashboard when authenticated', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
            expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument()
        })

        it('redirects from login to dashboard when authenticated', () => {
            renderWithRouter({
                initialRoute: '/login',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
            expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
        })

        it('redirects from register to dashboard when authenticated', () => {
            renderWithRouter({
                initialRoute: '/register',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
            expect(screen.queryByTestId('register-page')).not.toBeInTheDocument()
        })

        it('uses replace for redirect', () => {
            renderWithRouter({
                initialRoute: '/login',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
        })
    })

    // ─── Non-public routes ────────────────────────────────────────────────────────

    describe('non-public routes', () => {
        it('renders outlet on dashboard when authenticated', () => {
            renderWithRouter({
                initialRoute: '/dashboard',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
        })

        it('does not redirect on non-public routes when authenticated', () => {
            renderWithRouter({
                initialRoute: '/dashboard',
                authState: {isLoading: false, isAuthenticated: true, isError: false},
            })
            expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument()
            expect(screen.getByTestId('dashboard-page')).toBeInTheDocument()
        })
    })

    // ─── Hook wiring ──────────────────────────────────────────────────────────────

    describe('hook wiring', () => {
        it('calls useInitAuth', () => {
            renderWithRouter()
            expect(useInitAuth).toHaveBeenCalled()
        })

        it('mounts the notification socket unconditionally -- this component wraps every route, so the connection stays open across navigation instead of depending on which dashboard header happens to render the bell', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: true, isAuthenticated: false, isError: false},
            })
            expect(useNotificationSocket).toHaveBeenCalled()
        })

        it('mounts language sync unconditionally, so preferred_language takes effect as soon as it is known rather than only where a LanguageSwitcher happens to be mounted', () => {
            renderWithRouter({
                initialRoute: '/',
                authState: {isLoading: true, isAuthenticated: false, isError: false},
            })
            expect(useLanguageSync).toHaveBeenCalled()
        })
    })
})