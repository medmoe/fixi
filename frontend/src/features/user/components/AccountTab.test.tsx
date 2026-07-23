// src/features/user/components/__tests__/AccountTab.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AccountTab} from '@/features/user/components/AccountTab'
import {useChangePassword, useDeactivateAccount, useUpdateUser, useUser,} from '@/features/user'
import {useAuth} from '@/features/auth'

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@hookform/resolvers/zod', () => ({
    zodResolver: () => () => ({values: {}, errors: {}}),
}))

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
    useUpdateUser: vi.fn(),
    useChangePassword: vi.fn(),
    useDeactivateAccount: vi.fn(),
    userUpdateSchema: {},
    userPasswordSchema: {},
}))

vi.mock('@/features/auth', () => ({
    useAuth: vi.fn(),
}))

// Stub UI components to avoid heavy DOM — AccountTab's job is wiring, not rendering inputs
vi.mock('@/components/ui/form', () => ({
    Form: ({children}: any) => <div>{children}</div>,   // ← use <div>, not <form>
    FormControl: ({children}: any) => <>{children}</>,
    FormField: ({render}: any) => render({field: {onChange: vi.fn(), value: ''}}),
    FormItem: ({children}: any) => <div>{children}</div>,
    FormLabel: ({children}: any) => <label>{children}</label>,
    FormMessage: () => null,
}))

vi.mock('@/components/ui/button', () => ({
    Button: ({children, disabled, type, onClick, className}: any) => (
        <button type={type || 'button'} disabled={disabled} onClick={onClick} className={className}>
            {children}
        </button>
    ),
}))

vi.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}))

vi.mock('@/components/ui/card', () => ({
    Card: ({children, className}: any) => <div className={className}>{children}</div>,
    CardContent: ({children}: any) => <div>{children}</div>,
    CardHeader: ({children}: any) => <div>{children}</div>,
    CardTitle: ({children, className}: any) => <h3 className={className}>{children}</h3>,
    CardDescription: ({children}: any) => <p>{children}</p>,
}))

vi.mock('@/components/ui/alert-dialog', () => ({
    AlertDialog: ({children}: any) => <div>{children}</div>,
    AlertDialogAction: ({children, onClick, disabled}: any) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
    AlertDialogCancel: ({children}: any) => <button>{children}</button>,
    AlertDialogContent: ({children}: any) => <div>{children}</div>,
    AlertDialogDescription: ({children}: any) => <p>{children}</p>,
    AlertDialogFooter: ({children}: any) => <div>{children}</div>,
    AlertDialogHeader: ({children}: any) => <div>{children}</div>,
    AlertDialogTitle: ({children}: any) => <h4>{children}</h4>,
    AlertDialogTrigger: ({children}: any) => <div>{children}</div>,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    location: 'New York, NY',
    profile_image_url: 'https://example.com/image.jpg',
    role_type: 'worker',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUpdateMutate = vi.fn()
const mockPasswordMutate = vi.fn()
const mockDeactivateMutate = vi.fn()
const mockLogout = vi.fn()

const renderComponent = () => render(<AccountTab/>)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AccountTab', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useUser).mockReturnValue({data: mockUser} as any)
        vi.mocked(useAuth).mockReturnValue({logout: mockLogout} as any)
        vi.mocked(useUpdateUser).mockReturnValue({
            mutate: mockUpdateMutate,
            isPending: false,
        } as any)
        vi.mocked(useChangePassword).mockReturnValue({
            mutate: mockPasswordMutate,
            isPending: false,
        } as any)
        vi.mocked(useDeactivateAccount).mockReturnValue({
            mutate: mockDeactivateMutate,
            isPending: false,
        } as any)
    })

    // ─── Rendering ────────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders page header', () => {
            renderComponent()
            expect(screen.getByText('Account Settings')).toBeInTheDocument()
            expect(screen.getByText(/Manage your personal information/)).toBeInTheDocument()
        })
        it('renders profile information card', () => {
            renderComponent()
            expect(screen.getByText('Profile Information')).toBeInTheDocument()
        })
        it('renders change password card', () => {
            renderComponent()
            const elements = screen.getAllByText('Change Password')
            expect(elements.length).toBe(2) // CardTitle + Button
        })
        it('renders danger zone card', () => {
            renderComponent()
            expect(screen.getByText('Danger Zone')).toBeInTheDocument()
        })
        it('returns null when user is not loaded', () => {
            vi.mocked(useUser).mockReturnValue({data: null} as any)
            const {container} = renderComponent()
            expect(container.firstChild).toBeNull()
        })
    })

    // ─── Profile form ─────────────────────────────────────────────────────────────

    describe('profile form', () => {
        it('renders save changes button', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: /save changes/i})).toBeInTheDocument()
        })
        it('save button is disabled when form is pristine', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: /save changes/i})).toBeDisabled()
        })
        it('save button is disabled when update is pending', () => {
            vi.mocked(useUpdateUser).mockReturnValue({
                mutate: mockUpdateMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByRole('button', {name: /saving/i})).toBeDisabled()
        })
        it('shows spinner text when update is pending', () => {
            vi.mocked(useUpdateUser).mockReturnValue({
                mutate: mockUpdateMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByText(/saving/i)).toBeInTheDocument()
        })
    })

    // ─── Password form ────────────────────────────────────────────────────────────

    describe('password form', () => {
        it('renders change password button', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: /change password/i})).toBeInTheDocument()
        })
        it('change password button is disabled when pending', () => {
            vi.mocked(useChangePassword).mockReturnValue({
                mutate: mockPasswordMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByRole('button', {name: /changing/i})).toBeDisabled()
        })
        it('shows spinner text when password change is pending', () => {
            vi.mocked(useChangePassword).mockReturnValue({
                mutate: mockPasswordMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByText(/changing/i)).toBeInTheDocument()
        })
    })

    // ─── Deactivate account ───────────────────────────────────────────────────────

    describe('deactivate account', () => {
        it('renders deactivate button', () => {
            renderComponent()
            expect(screen.getByRole('button', {name: /deactivate account/i})).toBeInTheDocument()
        })
        it('renders confirmation dialog content', () => {
            renderComponent()
            expect(screen.getByText('Deactivate your account?')).toBeInTheDocument()
            expect(screen.getByText(/soft-delete your account/)).toBeInTheDocument()
        })
        it('calls deactivate mutate and logout on confirm', async () => {
            renderComponent()
            const confirmButton = screen.getByRole('button', {name: /yes, deactivate/i})
            await act(async () => await userEvent.click(confirmButton))
            expect(mockDeactivateMutate).toHaveBeenCalled()
        })
        it('disable button is disabled when deactivation is pending', () => {
            vi.mocked(useDeactivateAccount).mockReturnValue({
                mutate: mockDeactivateMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByRole('button', {name: /deactivating/i})).toBeDisabled()
        })
        it('shows spinner text when deactivation is pending', () => {
            vi.mocked(useDeactivateAccount).mockReturnValue({
                mutate: mockDeactivateMutate,
                isPending: true,
            } as any)
            renderComponent()
            expect(screen.getByText(/deactivating/i)).toBeInTheDocument()
        })
    })

    // ─── Hook wiring ──────────────────────────────────────────────────────────────

    describe('hook wiring', () => {
        it('calls useUpdateUser with user username', () => {
            renderComponent()
            expect(useUpdateUser).toHaveBeenCalledWith('john_doe')
        })
        it('calls useChangePassword with user username', () => {
            renderComponent()
            expect(useChangePassword).toHaveBeenCalledWith('john_doe')
        })
        it('calls useDeactivateAccount with user username', () => {
            renderComponent()
            expect(useDeactivateAccount).toHaveBeenCalledWith('john_doe')
        })
        it('calls useUser to get current user data', () => {
            renderComponent()
            expect(useUser).toHaveBeenCalled()
        })
    })
})