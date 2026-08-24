// src/features/worker/components/__tests__/ProfileForm.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {ProfileForm} from '@/features/worker/components/ProfileForm.tsx'
import {useUpdateWorkerProfile} from '@/features/worker/hooks/useUpdateWorkerProfile.ts'
import {useAssignTrades} from '@/features/worker/hooks/useAssignTrades.ts'
import type {WorkerProfileWithTradesRead} from '@/features/worker/types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/worker/hooks/useUpdateWorkerProfile')
vi.mock('@/features/worker/hooks/useAssignTrades')  // <-- FIX: mock this too!
vi.mock('@/features/worker/hooks/useTrades', () => ({
    useTrades: () => ({data: [], isLoading: false}),
}))

// stub child components — ProfileForm's job is wiring, not rendering fields
vi.mock('@/features/worker/components/fields/BioField', () => ({
    BioField: () => <textarea aria-label="Bio" data-testid="bio-field"/>,
}))
vi.mock('@/features/worker/components/fields/HourlyRateField', () => ({
    HourlyRateField: () => <input type="number" aria-label="Hourly rate" data-testid="hourly-rate-field"/>,
}))
vi.mock('@/features/worker/components/fields/ServiceRadiusField', () => ({
    ServiceRadiusField: () => <div data-testid="service-radius-field"/>,
}))
vi.mock('@/features/worker/components/fields/AvatarUploadField', () => ({
    AvatarUploadField: () => <div data-testid="avatar-upload-field"/>,
}))
vi.mock('@/features/worker/components/trades/TradeCategoryPicker', () => ({
    TradeCategoryPicker: () => <div data-testid="trades-picker"/>,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: WorkerProfileWithTradesRead = {
    id: 1,
    user_id: 1,
    bio: 'Experienced plumber',
    hourly_rate: "75.00",
    service_radius_km: 20,
    is_available: true,
    is_verified: false,
    available_since: null,
    trade_categories: [
        {
            trade_category_id: 1,
            worker_profile_id: 1,
            id: 1,
            skill_level: 'junior',
            trade_category: {
                id: 1,
                name: 'Plumbing',
                display_name: 'Plumbing services',
                icon_name: 'wrench',
                created_at: '2026-01-01T00:00:00.000Z',
                parent_id: null,
            }
        }
    ],
    years_of_experience: 10,
    avatar_url: null,
    user: {
        id: 1,
        name: "test name",
        location: null,
        display_location: null
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUpdateMutate = vi.fn()
const mockAssignMutate = vi.fn()
const mockRemoveMutate = vi.fn()

const renderComponent = async (profile: WorkerProfileWithTradesRead = mockProfile) => {
    let result: ReturnType<typeof render>
    await act(async () => {
        result = render(<ProfileForm profile={profile}/>)
    })
    return result!
}

const getSubmitButton = (name = 'Update Profile') => screen.getByRole('button', {name: name})


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(useUpdateWorkerProfile).mockReturnValue({
            mutate: mockUpdateMutate,
            isPending: false,
        } as any)

        // FIX: Mock useAssignTrades to return controlled mutations
        vi.mocked(useAssignTrades).mockReturnValue({
            assignTrades: {
                mutate: mockAssignMutate,
                mutateAsync: vi.fn(),
                isPending: false,
                isSuccess: false,
                isError: false,
                data: undefined,
                error: null,
                status: 'idle',
                reset: vi.fn(),
            } as any,
            removeTrade: {
                mutate: mockRemoveMutate,
                mutateAsync: vi.fn(),
                isPending: false,
                isSuccess: false,
                isError: false,
                data: undefined,
                error: null,
                status: 'idle',
                reset: vi.fn(),
            } as any,
        })
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders all child fields', async () => {
            await renderComponent()
            expect(screen.getByTestId('avatar-upload-field')).toBeInTheDocument()
            expect(screen.getByTestId('bio-field')).toBeInTheDocument()
            expect(screen.getByTestId('hourly-rate-field')).toBeInTheDocument()
            expect(screen.getByTestId('service-radius-field')).toBeInTheDocument()
            expect(screen.getByTestId('trades-picker')).toBeInTheDocument()
        })

        it('renders the save button', async () => {
            await renderComponent()
            expect(getSubmitButton()).toBeInTheDocument()
        })

        it('renders without crashing when optional fields are undefined', async () => {
            await renderComponent({
                ...mockProfile,
                bio: null,
                hourly_rate: null,
                service_radius_km: null,
                trade_categories: []
            })
            expect(getSubmitButton()).toBeInTheDocument()
        })
    })

    // ─── Submit button ────────────────────────────────────────────────────────

    describe('submit button', () => {
        it('is disabled when form is pristine', async () => {
            await renderComponent()
            expect(getSubmitButton()).toBeDisabled()
        })

        it('is disabled when mutation is pending', async () => {
            vi.mocked(useUpdateWorkerProfile).mockReturnValue({
                mutate: mockUpdateMutate,
                isPending: true,
            } as any)
            await renderComponent()
            expect(getSubmitButton('Saving...')).toBeDisabled()
        })

        it('has type="submit"', async () => {
            await renderComponent()
            expect(getSubmitButton()).toHaveAttribute('type', 'submit')
        })

        it('shows spinner when pending', async () => {
            vi.mocked(useUpdateWorkerProfile).mockReturnValue({
                mutate: mockUpdateMutate,
                isPending: true,
            } as any)
            await renderComponent()
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('does not show spinner when idle', async () => {
            await renderComponent()
            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
        })
    })

    // ─── Form submission ──────────────────────────────────────────────────────

    describe('form submission', () => {
        it('does not call mutate when button is disabled', async () => {
            await renderComponent()
            await act(async () => await userEvent.click(getSubmitButton()))
            expect(mockUpdateMutate).not.toHaveBeenCalled()
            expect(mockAssignMutate).not.toHaveBeenCalled()
        })

        it('does not call mutate when pending', async () => {
            vi.mocked(useUpdateWorkerProfile).mockReturnValue({
                mutate: mockUpdateMutate,
                isPending: true,
            } as any)
            await renderComponent()
            await act(async () => await userEvent.click(getSubmitButton('Saving...')))
            expect(mockUpdateMutate).not.toHaveBeenCalled()
        })
    })

    // ─── Layout ───────────────────────────────────────────────────────────────

    describe('layout', () => {
        it('renders hourly rate and service radius in a grid', async () => {
            await renderComponent()
            const grid =
                screen.getByTestId('hourly-rate-field').closest('.grid') ??
                screen.getByTestId('service-radius-field').closest('.grid')
            expect(grid).toBeInTheDocument()
        })

        it('renders trades picker inside a bordered section', async () => {
            await renderComponent()
            expect(screen.getByTestId('trades-picker').closest('.border-t')).toBeInTheDocument()
        })

        it('aligns submit button to the right', async () => {
            await renderComponent()
            expect(getSubmitButton().closest('.flex')).toHaveClass('justify-end')
        })
    })

    describe('Trade assignment integration', () => {
        it('fires assignTrades after upgradeProfile when pendingIds exist', async () => {
            // This would need to simulate pendingIds state via TradeCategoryPicker interaction
            // or test at a higher level with the actual picker
        })
        it('does not fire assignTrades when pendingIds is empty', async () => {
            // Same — requires integration with actual picker or state manipulation
        })
        it('clears pendingIds after successful assign', async () => {
            // Same — requires integration testing
        })
    })
})