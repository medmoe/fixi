import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {useUser} from '@/features/user'
import {useWorkerProfile, WorkerDashboardPage, WorkerProfileWithTradesRead} from "@/features/worker";

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

vi.mock('@/features/worker/components/AvailabilityToggle', () => ({
    AvailabilityToggle: ({isAvailable}: { isAvailable: boolean }) => (
        <div data-testid="availability-toggle">{isAvailable ? 'Available' : 'Unavailable'}</div>
    ),
}))

vi.mock('@/features/worker/hooks/useWorkerProfile', () => ({
    useWorkerProfile: vi.fn(),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    role_type: 'worker',
}

const mockWorkerProfile: WorkerProfileWithTradesRead = {
    id: 1,
    user_id: 1,
    bio: 'Bio text test.',
    hourly_rate: 100,
    years_of_experience: 10,
    is_available: false,
    is_verified: true,
    available_since: null,
    trade_categories: []
}

const mockAvailableWorkerProfile: WorkerProfileWithTradesRead = {
    ...mockWorkerProfile,
    is_available: true,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {retry: false},
        mutations: {retry: false},
    }
})

const renderWithClient = (ui: React.ReactElement) => {
    const queryClient = createTestQueryClient()
    return render(
        <QueryClientProvider client={queryClient}>
            {ui}
        </QueryClientProvider>
    )
}

const renderComponent = () => renderWithClient(<WorkerDashboardPage/>)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WorkerDashboardPage', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // ─── Loading state ────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading spinner when worker profile is loading', () => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('show loading spinner when user is loading', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.queryByText('Loading your dashboard...')).toBeInTheDocument()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('does not show tabs when loading', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: true,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
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
        it('shows error message when worker profile fetch fails', () => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            renderComponent()
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
            expect(screen.getByText(/We ran into trouble loading/)).toBeInTheDocument()
        })

        it('shows error when worker profile is null', () => {
            vi.mocked(useUser).mockReturnValue({
                data: mockUser,
                isLoading: false,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
        })

        it('show error when user fetch fails', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.queryByText('System Synchronization Failure')).toBeInTheDocument()
        })

        it('shows error message when user is null', async () => {
            vi.mocked(useUser).mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
            expect(screen.getByText(/We ran into trouble loading/)).toBeInTheDocument()
        })

        it('does not show tabs when error', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
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
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
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

        it('renders availability toggle in sidebar', () => {
            renderComponent()
            expect(screen.getByTestId('availability-section')).toBeInTheDocument()
            expect(screen.getByTestId('availability-section')).toContainElement(screen.getAllByTestId('availability-toggle')[0])
        })

        it('renders availability toggle in mobile view', () => {
            renderComponent()
            expect(screen.getByTestId('mobile-availability')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-availability')).toContainElement(screen.getAllByTestId('availability-toggle')[1])
        })

        it('passes isAvailable=false to AvailabilityToggle when worker is unavailable', () => {
            renderComponent()
            const toggles = screen.getAllByText('Unavailable')
            expect(toggles).toHaveLength(2)
        })

        it('passes isAvailable=true to AvailabilityToggle when worker is available', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockAvailableWorkerProfile,
                isLoading: false,
                error: null,
            } as any)
            renderComponent()
            const toggles = screen.getAllByText('Available')
            expect(toggles).toHaveLength(2)
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
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
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
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorkerProfile,
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