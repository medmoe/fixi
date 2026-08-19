import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useUser} from '@/features/user'
import {useWorkerProfile, WorkerDashboardPage} from "@/features/worker";
import {mockAvailableWorkerProfile, mockUser, mockWorker} from "@/features/worker/tests/mocks.ts";
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";
import {QueryClient} from "@tanstack/react-query";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
    AccountTab: () => <div data-testid="account-tab"/>,
}))

vi.mock("@/features/worker/hooks/useWorkerProfile")
vi.mock("@/features/worker/components/ProfileTab", () => ({
    ProfileTab: () => <div data-testid="profile-tab">ProfileTab</div>
}))


vi.mock('@/components/LogoutButton', () => ({
    LogoutButton: () => <button>Logout</button>,
}))

vi.mock('@/features/worker/components/AvailabilityToggle', () => ({
    AvailabilityToggle: ({isAvailable}: { isAvailable: boolean }) => (
        <div data-testid="availability-toggle">{isAvailable ? 'Available' : 'Unavailable'}</div>
    ),
}))

// vi.mocked(useUser).mockReturnValue({
//     data: mockUser,
//     isLoading: false,
//     isError: false,
//     error: null,
//     isSuccess: true,
//     status: "success",
//     fetchStatus: 'idle',
// } as any)
//
// vi.mocked(useWorkerProfile).mockReturnValue({
//     data: mockWorker(1),
//     isLoading: false,
//     isError: false,
//     error: null,
//     isSuccess: true,
//     status: "success",
//     fetchStatus: 'idle',
// } as any)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('WorkerDashboardPage', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        queryClient = createQueryClient()
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
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
                data: mockWorker,
                isLoading: false,
                error: null,
            } as any)
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByText('System Synchronization Failure')).toBeInTheDocument()
        })

        it('show error when user fetch fails', () => {
            vi.mocked(useUser).mockReturnValue({
                data: undefined,
                isLoading: false,
                error: new Error('API error'),
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorker,
                isLoading: false,
                error: null,
            } as any)
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.queryByText('System Synchronization Failure')).toBeInTheDocument()
        })

        it('shows error message when user is null', async () => {
            vi.mocked(useUser).mockReturnValue({
                data: null,
                isLoading: false,
                error: null,
            } as any)
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockWorker,
                isLoading: false,
                error: null,
            } as any)
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
                data: mockWorker(1),
                isLoading: false,
                error: null,
            } as any)
        })

        it('renders user avatar with first initial', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            await waitFor(() => expect(screen.getAllByText('J')).toHaveLength(2))
        })

        it('renders user name in sidebar', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            await waitFor(() => expect(screen.getAllByText('John Doe')).toHaveLength(2))
        })

        it('renders user role in sidebar', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            await waitFor(() => expect(screen.getByText('worker')).toBeInTheDocument())
        })

        it('renders logout button', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            await waitFor(() => expect(screen.getAllByRole('button', {name: /logout/i})).toHaveLength(2))
        })

        it('renders Profile tab by default', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument() // we use queryByTestId for elements that we expect to be absent.
        })

        it('renders navigation tabs', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            const profiles = screen.getAllByRole('button', {name: /profile/i})
            expect(profiles).toHaveLength(2)
            const accounts = screen.getAllByRole('button', {name: /account/i})
            expect(accounts).toHaveLength(2)
        })

        it('renders availability toggle in sidebar', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByTestId('availability-section')).toBeInTheDocument()
            expect(screen.getByTestId('availability-section')).toContainElement(screen.getAllByTestId('availability-toggle')[0])
        })

        it('renders availability toggle in mobile view', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByTestId('mobile-availability')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-availability')).toContainElement(screen.getAllByTestId('availability-toggle')[1])
        })

        it('passes isAvailable=false to AvailabilityToggle when worker is unavailable', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            const toggles = screen.getAllByText('Unavailable')
            expect(toggles).toHaveLength(2)
        })

        it('passes isAvailable=true to AvailabilityToggle when worker is available', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockAvailableWorkerProfile,
                isLoading: false,
                error: null,
            } as any)
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
                data: mockWorker,
                isLoading: false,
                error: null,
            } as any)
        })

        it('switches to Account tab when clicked', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            const accountButton = screen.getAllByRole('button', {name: /account/i})[0]
            await act(async () => await userEvent.click(accountButton))
            expect(screen.getByTestId('account-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument()
        })

        it('switches back to Profile tab when clicked', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            const accountButton = screen.getAllByRole('button', {name: /account/i})[0]
            await act(async () => await userEvent.click(accountButton))
            const profileButton = screen.getAllByRole('button', {name: /profile/i})[0]
            await act(async () => await userEvent.click(profileButton))
            expect(screen.getByTestId('profile-tab')).toBeInTheDocument()
            expect(screen.queryByTestId('account-tab')).not.toBeInTheDocument()
        })

        it('highlights active tab', async () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
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
                data: mockWorker,
                isLoading: false,
                error: null,
            } as any)
        })

        it('renders sidebar', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByTestId('sidebar-header')).toBeInTheDocument()
            expect(screen.getByTestId('sidebar-header')).toHaveTextContent('John Doe')
        })

        it('renders mobile header', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            expect(screen.getByTestId('mobile-header')).toBeInTheDocument()
            expect(screen.getByTestId('mobile-header')).toHaveTextContent('John Doe')
        })

        it('renders mobile tab switcher', () => {
            render(<WorkerDashboardPage/>, {wrapper: createWrapper(queryClient)})
            const mobileTabs = screen.getAllByRole('button', {name: /profile/i})
            expect(mobileTabs.length).toBeGreaterThanOrEqual(1)
        })
    })
})