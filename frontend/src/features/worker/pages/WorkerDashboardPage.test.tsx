import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {WorkerDashboardPage} from '@/features/worker/pages/WorkerDashboardPage'
import {useUser} from '@/features/user'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
    AccountTab: () => <div data-testid="account-tab">AccountTab</div>,
}))

vi.mock('../components/ProfileTab', () => ({
    ProfileTab: () => <div data-testid="profile-tab">ProfileTab</div>,
}))

vi.mock('@/components/LogoutButton', () => ({
    LogoutButton: () => <button>Logout</button>,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    role_type: 'worker',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderComponent = () => render(<WorkerDashboardPage/>)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WorkerDashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── Loading state ────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading spinner when user is loading', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })
        it('does not show tabs when loading', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
            } as any)
            renderComponent()
            expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument()
        })
    })

    // ─── Error state ──────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('shows error message when user fetch fails', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            renderComponent()
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
            expect(screen.getByText(/We ran into trouble loading/)).toBeInTheDocument()
        })
        it('shows error when user is null', () => {
            vi.mocked(useUser).mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
        })
        it('does not show tabs when error', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            renderComponent()
            expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument()
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────

    describe('success state', () => {
        beforeEach(() => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
        })

        it('renders user avatar with first initial', () => {
            renderComponent()
            const avatars = screen.getAllByText('J')
            expect(avatars).toHaveLength(2)
        })
        it('renders user name in sidebar', () => {
            renderComponent()
            const usernames = screen.getAllByText('John Doe')
            expect(usernames).toHaveLength(2)
        })
        it('renders user role in sidebar', () => {
            renderComponent()
            expect(screen.getByText(/Worker/i)).toBeInTheDocument()
        })
        it('renders logout button', () => {
            renderComponent()
            const buttons = screen.getAllByRole('button', {name: /logout/i})
            expect(buttons).toHaveLength(2)
        })
        it('renders Profile tab by default', () => {
            renderComponent()
            expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument()
        })
        it('renders navigation tabs', () => {
            renderComponent()
            const profiles = screen.getAllByRole('button', {name: /profile/i})
            expect(profiles).toHaveLength(2)
            const accounts = screen.getAllByRole('button', {name: /account/i})
            expect(accounts).toHaveLength(2)
        })
    })

    // ─── Tab switching ────────────────────────────────────────────────────────────

    describe('tab switching', () => {
        beforeEach(() => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
        })

        it('switches to Account tab when clicked', async () => {
            renderComponent()
            const accountButton = screen.getAllByRole('button', {name: /account/i})[0]
            await act(async () => await userEvent.click(accountButton))
            expect(screen.getByTestId('account-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()
        })
        it('switches back to Profile tab when clicked', async () => {
            renderComponent()
            const accountButton = screen.getAllByRole('button', {name: /account/i})[0]
            await act(async () => await userEvent.click(accountButton))
            const profileButton = screen.getAllByRole('button', {name: /profile/i})[0]
            await act(async () => await userEvent.click(profileButton))
            expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument()
        })
        it('highlights active tab', async () => {
            renderComponent()
            const accountButton = screen.getAllByRole('button', {name: /account/i})[0]
            await act(async () => await userEvent.click(accountButton))
            expect(accountButton.className).toContain('bg-primary/10')
        })
    })

    // ─── Layout ───────────────────────────────────────────────────────────────────

    describe('layout', () => {
        beforeEach(() => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
        })

        it('renders sidebar', () => {
            renderComponent()
            expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
            expect(screen.getByTestId('sidebar-header')).toHaveTextContent('John Doe')
        })
        it('renders mobile header', () => {
            renderComponent()
            expect(screen.getByTestId('mobile-header')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-header')).toHaveTextContent('John Doe')
        })
        it('renders mobile tab switcher', () => {
            renderComponent()
            const mobileTabs = screen.getAllByRole('button', {name: /profile/i})
            expect(mobileTabs.length).toBeGreaterThanOrEqual(1)
        })
    })
})