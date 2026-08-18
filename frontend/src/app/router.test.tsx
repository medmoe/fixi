// src/app/router.test.tsx
import {render, screen} from '@testing-library/react'
import {createMemoryRouter, Outlet, RouterProvider} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import {routes} from './router'

// 1. Mock page components to isolate router testing from page implementations
vi.mock('@/features/landing', () => ({LandingPage: () => <div>Landing Page</div>}))
vi.mock('@/features/auth', () => ({
    LoginPage: () => <div>Login Page</div>,
    RegisterPage: () => <div>Register Page</div>,
    AuthInitializer: () => <div data-testid="auth-initializer"><Outlet/></div>,
}))
vi.mock('@/features/worker', () => ({
    WorkerDashboardPage: () => <div>Worker Dashboard</div>,
    WorkerSearchPage: () => <div>Worker Search Page</div>,
}))

// 3. Mock ProtectedRoute based on your app's auth state
vi.mock('@/components/ProtectedRoute.tsx', () => ({
    default: ({children}: { children: React.ReactNode }) => <div data-testid="protected-route">{children}</div>,
}))

describe('App Router', () => {
    const renderWithRouter = (initialEntries: string[]) => {
        const testRouter = createMemoryRouter(routes, {initialEntries})
        return render(<RouterProvider router={testRouter}/>)
    }

    it('renders LandingPage at root "/" path', () => {
        renderWithRouter(['/'])
        expect(screen.getByText('Landing Page')).toBeInTheDocument()
    })

    it('renders LoginPage at "/login"', () => {
        renderWithRouter(['/login'])
        expect(screen.getByText('Login Page')).toBeInTheDocument()
    })

    it('renders RegisterPage at "/register"', () => {
        renderWithRouter(['/register'])
        expect(screen.getByText('Register Page')).toBeInTheDocument()
    })

    it('wraps protected worker dashboard inside ProtectedRoute at "/dashboard"', () => {
        renderWithRouter(['/dashboard'])

        expect(screen.getByTestId('protected-route')).toBeInTheDocument()
        expect(screen.getByText('Worker Dashboard')).toBeInTheDocument()
    })

    it('renders WorkerSearchPage at "/workers/search"', () => {
        renderWithRouter(['/workers/search'])

        expect(screen.getByText('Worker Search Page')).toBeInTheDocument()
    })
})