// src/features/auth/__tests__/LoginForm.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {act} from 'react'
import {LoginForm} from '@/features/auth/components/LoginForm'
import {useAuth} from '@/features/auth/hooks/useAuth'
import {renderWithProviders} from '@/test/renderWithProviders'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth/hooks/useAuth')

const mockLogin = vi.fn()

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue({
            login: mockLogin,
            logout: vi.fn(),
            isLoggingIn: false,
            isLoggingOut: false,
            isAuthenticated: false,
            accessToken: null,
            isLoading: false,
        })
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders username or email input', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByLabelText('Username or email')).toBeInTheDocument()
        })

        it('renders password input', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByLabelText('Password')).toBeInTheDocument()
        })

        it('renders sign in button', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByRole('button', {name: /sign in/i})).toBeInTheDocument()
        })

        it('renders register link', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByRole('link', {name: /register/i})).toBeInTheDocument()
        })

        it('password input type is password', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
        })

        it('does not show spinner when idle', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
        })
    })

    // ─── Pending state ────────────────────────────────────────────────────────

    describe('pending state', () => {
        beforeEach(() => {
            vi.mocked(useAuth).mockReturnValue({
                login: mockLogin,
                logout: vi.fn(),
                isLoggingIn: true,
                isLoggingOut: false,
                isAuthenticated: false,
                accessToken: null,
                isLoading: false,
            })
        })

        it('shows spinner when logging in', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('disables submit button when logging in', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByRole('button', {name: /sign in/i})).toBeDisabled()
        })

        it('shows signing in text when pending', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByText(/signing in/i)).toBeInTheDocument()
        })
    })

    // ─── Validation ───────────────────────────────────────────────────────────

    describe('validation', () => {
        it('shows error when username field is empty on submit', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            await screen.findByText(/username or email is required/i)
        })

        it('shows error when password field is empty on submit', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            await screen.findByText(/password is required/i)
        })

        it('does not call login when fields are empty', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            expect(mockLogin).not.toHaveBeenCalled()
        })
    })

    // ─── Submission ───────────────────────────────────────────────────────────

    describe('submission', () => {
        it('calls login with correct credentials', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.type(
                    screen.getByLabelText('Username or email'),
                    'johndoe'
                )
                await userEvent.type(
                    screen.getByLabelText('Password'),
                    'Pass123'
                )
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            await waitFor(() =>
                expect(mockLogin).toHaveBeenCalledWith({
                    username_or_email: 'johndoe',
                    password: 'Pass123',
                })
            )
        })

        it('calls login exactly once per submit', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Username or email'), 'johndoe')
                await userEvent.type(screen.getByLabelText('Password'), 'Pass123')
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            await waitFor(() => expect(mockLogin).toHaveBeenCalledTimes(1))
        })

        it('accepts email as username_or_email', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })

            await act(async () => {
                await userEvent.type(
                    screen.getByLabelText('Username or email'),
                    'john@example.com'
                )
                await userEvent.type(screen.getByLabelText('Password'), 'Pass123')
                await userEvent.click(screen.getByRole('button', {name: /sign in/i}))
            })

            await waitFor(() =>
                expect(mockLogin).toHaveBeenCalledWith({
                    username_or_email: 'john@example.com',
                    password: 'Pass123',
                })
            )
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('username input has correct autocomplete', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByLabelText('Username or email'))
                .toHaveAttribute('autocomplete', 'username')
        })

        it('password input has correct autocomplete', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByLabelText('Password'))
                .toHaveAttribute('autocomplete', 'current-password')
        })

        it('submit button has type submit', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByRole('button', {name: /sign in/i}))
                .toHaveAttribute('type', 'submit')
        })

        it('form has aria-label', async () => {
            await act(async () => {
                renderWithProviders(<LoginForm/>)
            })
            expect(screen.getByRole('form', {name: /login form/i}))
                .toBeInTheDocument()
        })
    })
})