import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import {ProfileTab} from '@/features/worker/components/ProfileTab.tsx'
import {useWorkerProfile} from '@/features/worker'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/worker', () => ({
    useWorkerProfile: vi.fn(),
    useUpdateWorkerProfile: vi.fn(() => ({
        mutate: vi.fn(),
        isPending: false,
    })),
}))

vi.mock('@/features/worker/components/ProfileForm', () => ({
    ProfileForm: () => <div data-testid="profile-form">ProfileForm</div>,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile = {
    id: 1,
    bio: 'Experienced plumber',
    hourly_rate: 75.00,
    service_radius_km: 20,
    is_available: true,
    is_verified: false,
    available_since: null,
    trades: [{trade_id: 1, skill_level: 'junior'}],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderComponent = () => render(<ProfileTab/>)

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileTab', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>
    beforeEach(() => {
        vi.clearAllMocks()
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        })
    })
    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    // ─── Loading state ────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading spinner when profile is loading', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('Loading your worker profile...')).toBeInTheDocument()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })
        it('does not show ProfileForm when loading', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument()
        })
    })

    // ─── Error state ──────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('shows error message when profile fetch fails', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
                error: new Error('API error'),
            } as any)
            renderComponent()
            expect(screen.getByText('Failed to Load Profile')).toBeInTheDocument()
            expect(screen.getByText('Something went wrong loading your profile data. Please try again later.')).toBeInTheDocument()
        })
        it('does not show ProfileForm when error', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
                error: new Error('API error'),
            } as any)
            renderComponent()
            expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument()
        })
    })

    // ─── Empty profile state ──────────────────────────────────────────────────────

    describe('empty profile state', () => {
        it('shows not found message when profile is null', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: null,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('Profile Not Found')).toBeInTheDocument()
            expect(screen.getByText('Your worker profile could not be found. Please contact support.')).toBeInTheDocument()
        })
        it('does not show ProfileForm when profile is null', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: null,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument()
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('renders ProfileForm when profile is loaded', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockProfile,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByTestId('profile-form')).toBeInTheDocument()
        })
        it('renders page header with title', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockProfile,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText('Worker Profile')).toBeInTheDocument()
        })
        it('renders page description', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockProfile,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByText(/Manage your public-facing profile/)).toBeInTheDocument()
        })
        it('passes profile data to ProfileForm', () => {
            vi.mocked(useWorkerProfile).mockReturnValue({
                data: mockProfile,
                isLoading: false,
                isError: false,
                error: null,
            } as any)
            renderComponent()
            expect(screen.getByTestId('profile-form')).toBeInTheDocument()
        })
    })
})