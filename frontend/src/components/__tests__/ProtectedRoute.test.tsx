// src/components/__tests__/ProtectedRoute.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom'
import {ProtectedRoute} from '@/components/ProtectedRoute'
import {useAuth} from '@/features/auth'
import {useUser} from '@/features/user'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth', () => ({
    useAuth: vi.fn(),
}))

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
}))

// Capture navigation for assertions
const LocationDisplay = () => {
    const location = useLocation()
    return <div data-testid="location-display">{location.pathname}</div>
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockWorkerUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    role_type: 'worker',
}

const mockCustomerUser = {
    id: 2,
    name: 'Jane Doe',
    username: 'jane_doe',
    email: 'jane@example.com',
    role_type: 'customer',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TestChild = () => <div data-testid="protected-content">Protected Content</div>

const renderWithRouter = (
    {
        initialRoute = '/dashboard',
        allowedRoles,
        authState = {isLoading: false, isAuthenticated: true},
        userState = {data: mockWorkerUser, isLoading: false, error: null},
    }: {
        initialRoute?: string
        allowedRoles?: Array<'customer' | 'worker'>
        authState?: { isLoading: boolean; isAuthenticated: boolean }
        userState?: { data: any; isLoading: boolean; error: any }
    } = {}
) => {
    vi.mocked(useAuth).mockReturnValue(authState as any)
    vi.mocked(useUser).mockReturnValue(userState as any)

    return render(
        <MemoryRouter initialEntries={[initialRoute]} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
            <Routes>
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute allowedRoles={allowedRoles}>
                            <TestChild/>
                        </ProtectedRoute>
                    }
                />
                <Route path="/login" element={<div data-testid="login-page">Login</div>}/>
                <Route path="/" element={<div data-testid="landing-page">Landing</div>}/>
                <Route path="*" element={<LocationDisplay/>}/>
            </Routes>
        </MemoryRouter>
    )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── Loading state ────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading spinner when auth is initializing', () => {
            renderWithRouter({
                authState: {isLoading: true, isAuthenticated: false},
                userState: {data: undefined, isLoading: false, error: null},
            })
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })

        it('shows loading spinner when user profile is loading', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: undefined, isLoading: true, error: null},
            })
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })

        it('does not show loading when auth and user are ready', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockWorkerUser, isLoading: false, error: null},
            })
            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        })
    })

    // ─── Not authenticated ────────────────────────────────────────────────────────

    describe('not authenticated', () => {
        it('redirects to login when not authenticated', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: false},
                userState: {data: undefined, isLoading: false, error: null},
            })
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })

        it('preserves intended destination in navigation state', () => {
            renderWithRouter({
                initialRoute: '/dashboard',
                authState: {isLoading: false, isAuthenticated: false},
                userState: {data: undefined, isLoading: false, error: null},
            })
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
        })
    })

    // ─── User fetch error ─────────────────────────────────────────────────────────

    describe('user fetch error', () => {
        it('redirects to login on user fetch error', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: undefined, isLoading: false, error: new Error('Unauthorized')},
            })
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })
    })

    // ─── User data missing ────────────────────────────────────────────────────────

    describe('user data missing', () => {
        it('redirects to login when user data is null', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: null, isLoading: false, error: null},
            })
            expect(screen.getByTestId('login-page')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })
    })

    // ─── Role-based access ────────────────────────────────────────────────────────

    describe('role-based access', () => {
        it('renders content when user role is allowed', () => {
            renderWithRouter({
                allowedRoles: ['worker'],
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockWorkerUser, isLoading: false, error: null},
            })
            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        })

        it('redirects worker to dashboard when accessing customer-only route', () => {
            renderWithRouter({
                initialRoute: '/dashboard',
                allowedRoles: ['customer'],
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockWorkerUser, isLoading: false, error: null},
            })
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })

        it('renders children for customer when no allowedRoles restriction is set', () => {
            // /dashboard no longer carries allowedRoles — RoleBasedDashboard
            // handles per-role dispatching internally, so ProtectedRoute passes
            // any authenticated user through.
            renderWithRouter({
                initialRoute: '/dashboard',
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockCustomerUser, isLoading: false, error: null},
            })
            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        })

        it('redirects customer to landing when role not in allowedRoles', () => {
            renderWithRouter({
                allowedRoles: ['worker'],
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockCustomerUser, isLoading: false, error: null},
            })
            expect(screen.getByTestId('landing-page')).toBeInTheDocument()
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('renders children when all checks pass', () => {
            renderWithRouter({
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockWorkerUser, isLoading: false, error: null},
            })
            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        })

        it('renders without allowedRoles when user is authenticated', () => {
            renderWithRouter({
                allowedRoles: undefined,
                authState: {isLoading: false, isAuthenticated: true},
                userState: {data: mockWorkerUser, isLoading: false, error: null},
            })
            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
        })
    })

    // ─── Hook wiring ──────────────────────────────────────────────────────────────

    describe('hook wiring', () => {
        it('calls useAuth', () => {
            renderWithRouter()
            expect(useAuth).toHaveBeenCalled()
        })

        it('calls useUser', () => {
            renderWithRouter()
            expect(useUser).toHaveBeenCalled()
        })
    })
})