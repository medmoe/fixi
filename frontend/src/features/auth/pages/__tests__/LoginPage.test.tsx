
import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { act } from 'react'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('../hooks/useAuth')

describe('LoginPage', () => {
    beforeEach(() => {
        vi.mocked(useAuth).mockReturnValue({
            login: vi.fn(),
            logout: vi.fn(),
            isLoggingIn: false,
            isLoggingOut: false,
            isAuthenticated: false,
            accessToken: null,
            isLoading: false,
        })
    })

    it('renders page heading', async () => {
        await act(async () => { renderWithProviders(<LoginPage />) })
        expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    })

    it('renders subheading', async () => {
        await act(async () => { renderWithProviders(<LoginPage />) })
        expect(screen.getByText(/sign in to your fixi account/i)).toBeInTheDocument()
    })

    it('renders login form', async () => {
        await act(async () => { renderWithProviders(<LoginPage />) })
        expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument()
    })

    it('renders username and password fields', async () => {
        await act(async () => { renderWithProviders(<LoginPage />) })
        expect(screen.getByLabelText('Username or email')).toBeInTheDocument()
        expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders sign in button', async () => {
        await act(async () => { renderWithProviders(<LoginPage />) })
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })
})