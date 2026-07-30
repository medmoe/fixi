// src/components/__tests__/LogoutButton.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {LogoutButton} from '@/components/LogoutButton'
import {useAuth} from '@/features/auth'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth', () => ({
    useAuth: vi.fn(),
}))

vi.mock('@/components/ui/button', () => ({
    Button: ({children, onClick, disabled, className, 'data-testid': testId, 'aria-label': ariaLabel}: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid={testId}
            aria-label={ariaLabel}
        >
            {children}
        </button>
    ),
}))

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({children}: any) => <div>{children}</div>,
    AlertDialogAction: ({children, onClick, disabled, 'data-testid': testId}: any) => (
        <button onClick={onClick} disabled={disabled} data-testid={testId}>{children}</button>
    ),
    AlertDialogCancel: ({children, 'data-testid': testId}: any) => (
        <button data-testid={testId}>{children}</button>
    ),
    AlertDialogContent: ({children, 'data-testid': testId}: any) => (
        <div data-testid={testId}>{children}</div>
    ),
    AlertDialogDescription: ({children}: any) => <p>{children}</p>,
    AlertDialogFooter: ({children}: any) => <div>{children}</div>,
    AlertDialogHeader: ({children}: any) => <div>{children}</div>,
    AlertDialogTitle: ({children}: any) => <h3>{children}</h3>,
    AlertDialogTrigger: ({children}: any) => <div>{children}</div>,
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockLogout = vi.fn()

const renderComponent = () => render(<LogoutButton/>)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LogoutButton', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useAuth).mockReturnValue({
            logout: mockLogout,
            isLoggingOut: false,
        } as any)
    })

    // ─── Rendering ──────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders logout button', () => {
            renderComponent()
            expect(screen.getByTestId('logout-button')).toBeInTheDocument()
        })

        it('renders logout icon and text', () => {
            renderComponent()
            const button = screen.getByTestId('logout-button')
            expect(button).toHaveTextContent('Logout')
        })

        it('has correct aria-label', () => {
            renderComponent()
            expect(screen.getByLabelText('Logout')).toBeInTheDocument()
        })

        it('renders confirmation dialog content', () => {
            renderComponent()
            expect(screen.getByText('Are you sure?')).toBeInTheDocument()
            expect(screen.getByText(/You will be logged out/)).toBeInTheDocument()
        })

        it('renders cancel button in dialog', () => {
            renderComponent()
            expect(screen.getByTestId('logout-cancel')).toBeInTheDocument()
            expect(screen.getByTestId('logout-cancel')).toHaveTextContent('Cancel')
        })

        it('renders confirm button in dialog', () => {
            renderComponent()
            expect(screen.getByTestId('logout-confirm')).toBeInTheDocument()
        })
    })

    // ─── Interaction ────────────────────────────────────────────────────────────

    describe('interaction', () => {
        it('calls logout when confirm is clicked', async () => {
            renderComponent()
            await userEvent.click(screen.getByTestId('logout-confirm'))
            expect(mockLogout).toHaveBeenCalledTimes(1)
        })

        it('does not call logout when cancel is clicked', async () => {
            renderComponent()
            await userEvent.click(screen.getByTestId('logout-cancel'))
            expect(mockLogout).not.toHaveBeenCalled()
        })
    })

    // ─── Loading state ───────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('disables confirm button when logging out', () => {
            vi.mocked(useAuth).mockReturnValue({
                logout: mockLogout,
                isLoggingOut: true,
            } as any)
            renderComponent()
            expect(screen.getByTestId('logout-confirm')).toBeDisabled()
        })

        it('shows loading text when logging out', () => {
            vi.mocked(useAuth).mockReturnValue({
                logout: mockLogout,
                isLoggingOut: true,
            } as any)
            renderComponent()
            expect(screen.getByText(/logging out/i)).toBeInTheDocument()
        })

        it('does not show loading text when idle', () => {
            renderComponent()
            expect(screen.queryByText(/logging out/i)).not.toBeInTheDocument()
            expect(screen.getByTestId('logout-confirm')).toHaveTextContent('Logout')
        })
    })

    // ─── Hook wiring ────────────────────────────────────────────────────────────

    describe('hook wiring', () => {
        it('calls useAuth hook', () => {
            renderComponent()
            expect(useAuth).toHaveBeenCalled()
        })
    })
})