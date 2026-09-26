import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useFormContext} from 'react-hook-form'
import {ProfileForm, useAssignTrades, useTrades, useUpdateWorkerProfile, WorkerProfileWithTradesRead, WorkerTradeNestedRead} from "@/features/worker";
import {mockAssignedTrades, mockTradeCategories, mockWorker} from "../mocks"

// Mock BioField to actually register with react-hook-form so isDirty works
vi.mock("@/features/worker/hooks/useUpdateWorkerProfile")
vi.mock("@/features/worker/hooks/useAssignTrades")
vi.mock("@/features/worker/hooks/useTrades")
vi.mock("@/features/worker/hooks/useUploadAvatar")
vi.mock("@/features/worker/hooks/useUploadCniDocument")

vi.mock("@/features/worker/components/fields/AvatarUploadField", () => ({
    AvatarUploadField: () => <div data-testid="avatar-upload-field"/>
}))

vi.mock("@/features/worker/components/fields/CniVerificationField", () => ({
    CniVerificationField: () => <div data-testid="cni-verification-field"/>
}))

vi.mock("@/features/worker", async () => {
        const actual = await vi.importActual<typeof import("@/features/worker")>(
            "@/features/worker",
        )

        return {
            ...actual,
            BioField: () => {
                const {register} = useFormContext()

                return (
                    <textarea
                        {...register("bio")}
                        aria-label="Bio"
                        data-testid="bio-field"
                    />
                )
            },

            HourlyRateField: () => {
                const {register} = useFormContext()

                return (
                    <input
                        {...register("hourly_rate", {valueAsNumber: true})}
                        type="number"
                        aria-label="Hourly rate"
                        data-testid="hourly-rate-field"
                    />
                )
            },

            ServiceRadiusField: () => {
                const {register} = useFormContext()

                return (
                    <input
                        {...register("service_radius_km", {valueAsNumber: true})}
                        type="number"
                        aria-label="Service radius"
                        data-testid="service-radius-field"
                    />
                )
            },
        }
    }
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

let mockUpdateMutate: ReturnType<typeof vi.fn>
let mockAssignMutate: ReturnType<typeof vi.fn>
let mockRemoveMutate: ReturnType<typeof vi.fn>

let mockAssignOnSuccess: | ((data: WorkerTradeNestedRead[]) => void) | undefined

let mockAssignOnError: (() => void) | undefined

const setupMocks = (
    opts: {
        updatePending?: boolean
        assignPending?: boolean
    } = {},
) => {
    mockAssignOnSuccess = undefined
    mockAssignOnError = undefined

    mockUpdateMutate = vi.fn((_payload: any, options?: any) => {
        if (options?.onSuccess) {
            setTimeout(() => options.onSuccess(), 0)
        }
    })

    mockAssignMutate = vi.fn((_ids: number[], options?: any) => {
        mockAssignOnSuccess = options?.onSuccess
        mockAssignOnError = options?.onError
    })

    mockRemoveMutate = vi.fn((_id: number, options?: any) => {
        if (options?.onSuccess) {
            setTimeout(() => options.onSuccess([]), 0)
        }
    })

    vi.mocked(useUpdateWorkerProfile).mockReturnValue({
        mutate: mockUpdateMutate,
        isPending: opts.updatePending ?? false,
    } as any)

    vi.mocked(useAssignTrades).mockReturnValue({
        assignTrades: {
            mutate: mockAssignMutate,
            mutateAsync: vi.fn(),
            isPending: opts.assignPending ?? false,
            isSuccess: false,
            isError: false,
            data: undefined,
            error: null,
            status: "idle",
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
            status: "idle",
            reset: vi.fn(),
        } as any,
    })

    vi.mocked(useTrades).mockReturnValue({
        data: mockTradeCategories,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: "success",
        fetchStatus: "idle",
    } as any)
}
const renderComponent = (
    profile: WorkerProfileWithTradesRead = mockWorker(1, {
        trade_categories: [
            {
                id: 1,
                trade_category_id: 1,
                worker_profile_id: 1,
                trade_category: {display_name: "Plumbing", created_at: "2020-01-01", parent_id: null, icon_name: "wrench", id: 1, name: "plumbing"},
                skill_level: "junior"
            }
        ]
    })) => {
    return render(<ProfileForm profile={profile}/>)
}
const getSubmitButton = () => screen.getByRole('button', {name: /update profile/i})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ProfileForm — Trade Assignment Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        setupMocks()
    })

    describe('fires assignTrades after updateProfile when pendingIds exist', () => {
        it('selects a trade via TradeCategoryPicker and submits both profile + trades', async () => {
            const user = userEvent.setup()
            renderComponent()
            // Verify initial state — Plumbing is already assigned
            expect(screen.getByText('Plumbing')).toBeInTheDocument()
            expect(screen.getByText('Assigned')).toBeInTheDocument()

            // Select a new trade — click the "+ Electrical" button
            const electricalButton = screen.getByRole('button', {name: /electrical/i})
            await act(async () => await user.click(electricalButton))

            // Verify pending state appears
            await waitFor(() => {
                expect(screen.getByText('Pending (save to confirm)')).toBeInTheDocument()
            })
            expect(screen.getByText('Electrical')).toBeInTheDocument()

            // Change a form field to make form dirty
            const bioField = screen.getByLabelText(/bio/i)
            await act(async () => await user.clear(bioField))
            await act(async () => await user.type(bioField, 'Updated bio text'))

            // Wait for form to register as dirty
            await waitFor(() => {
                expect(getSubmitButton()).not.toBeDisabled()
            })

            // Submit the form
            await act(async () => await user.click(getSubmitButton()))

            // Assert: both mutations were called
            await waitFor(() => {
                expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
            })
            await waitFor(() => {
                expect(mockAssignMutate).toHaveBeenCalledTimes(1)
            })

            // Assert: updateProfile called with correct payload
            expect(mockUpdateMutate).toHaveBeenCalledWith(
                expect.objectContaining({bio: 'Updated bio text'}),
                expect.objectContaining({
                    onSuccess: expect.any(Function),
                    onError: expect.any(Function),
                })
            )

            // Assert: assignTrades called with the pending ID
            expect(mockAssignMutate).toHaveBeenCalledWith(
                [2],  // electrical's id
                expect.objectContaining({
                    onSuccess: expect.any(Function),
                    onError: expect.any(Function),
                })
            )
        })

        it('only fires assignTrades, not updateProfile, when form is pristine but trades are pending', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Select a trade without touching any form field
            const electricalButton = screen.getByRole('button', {name: /electrical/i})
            await act(async () => await user.click(electricalButton))

            // Wait for pending to appear and button to be enabled
            await waitFor(() => {
                expect(getSubmitButton()).not.toBeDisabled()
            })

            // Submit
            await act(async () => await user.click(getSubmitButton()))

            // Assert: assignTrades called, updateProfile NOT called (form is pristine)
            await waitFor(() => {
                expect(mockAssignMutate).toHaveBeenCalledTimes(1)
            })
            expect(mockUpdateMutate).not.toHaveBeenCalled()
        })
    })

    describe('does not fire assignTrades when pendingIds is empty', () => {
        it('only updates profile when no trades are pending', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Change bio to make form dirty
            const bioField = screen.getByLabelText(/bio/i)
            await act(async () => await user.clear(bioField))
            await act(async () => await user.type(bioField, 'Updated bio'))

            // Wait for button to be enabled
            await waitFor(() => {
                expect(getSubmitButton()).not.toBeDisabled()
            })

            // Submit — no trades selected
            await act(async () => await user.click(getSubmitButton()))

            // Assert: only profile update called
            await waitFor(() => {
                expect(mockUpdateMutate).toHaveBeenCalledTimes(1)
            })
            expect(mockAssignMutate).not.toHaveBeenCalled()
        })

        it('does nothing when form is pristine and no trades pending', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Button should be disabled initially
            const submitButton = getSubmitButton()
            expect(submitButton).toBeDisabled()

            // Even if we force click, nothing should happen
            await act(async () => await user.click(submitButton))

            expect(mockUpdateMutate).not.toHaveBeenCalled()
            expect(mockAssignMutate).not.toHaveBeenCalled()
        })
    })

    describe('clears pendingIds after successful assign', () => {
        it('pending trades move to assigned after onSuccess fires', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Select Electrical
            const electricalButton = screen.getByRole('button', {name: /electrical/i})
            await act(async () => await user.click(electricalButton))

            // Verify pending section shows
            await waitFor(() => {
                expect(screen.getByText('Pending (save to confirm)')).toBeInTheDocument()
            })

            // Make form dirty so submit is enabled
            const bioField = screen.getByLabelText(/bio/i)
            await act(async () => await user.clear(bioField))
            await act(async () => await user.type(bioField, 'Updated'))

            await waitFor(() => expect(getSubmitButton()).not.toBeDisabled())

            // Submit
            await act(async () => await user.click(getSubmitButton()))

            // Assert assignTrades was called
            await waitFor(() => {
                expect(mockAssignMutate).toHaveBeenCalledTimes(1)
            })

            // Simulate the mutation succeeding with updated trades
            const updatedTrades: WorkerTradeNestedRead[] = [
                ...mockAssignedTrades,
                {
                    id: 2,
                    worker_profile_id: 1,
                    trade_category_id: 2,
                    skill_level: 'junior',
                    trade_category: mockTradeCategories[1],
                }
            ]

            // Fire the onSuccess callback that ProfileForm passed to assignTrades.mutate
            await act(async () => {
                mockAssignOnSuccess?.(updatedTrades)
            })

            // Assert: pending section is gone
            await waitFor(() => {
                expect(screen.queryByText('Pending (save to confirm)')).not.toBeInTheDocument()
            })

            // Assert: Electrical now appears in Assigned section
            const assignedSection = screen.getByText('Assigned').closest('div')!
            expect(assignedSection).toHaveTextContent('Electrical')

            // Assert: badge shows 2/5
            expect(screen.getByText('2/5 Selected')).toBeInTheDocument()
        })

        it('pending trades are preserved when assign fails', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Select Electrical
            const electricalButton = screen.getByRole('button', {name: /electrical/i})
            await act(async () => await user.click(electricalButton))

            await waitFor(() => {
                expect(screen.getByText('Pending (save to confirm)')).toBeInTheDocument()
            })

            // Make form dirty and submit
            const bioField = screen.getByLabelText(/bio/i)
            await act(async () => await user.clear(bioField))
            await act(async () => await user.type(bioField, 'Updated'))
            await waitFor(() => expect(getSubmitButton()).not.toBeDisabled())

            await act(async () => await user.click(getSubmitButton()))

            await waitFor(() => {
                expect(mockAssignMutate).toHaveBeenCalledTimes(1)
            })

            // Simulate error by calling onError instead of onSuccess
            await act(async () => {
                mockAssignOnError?.()
            })

            // Pending should still be visible since onSuccess wasn't called
            expect(screen.getByText('Pending (save to confirm)')).toBeInTheDocument()
            expect(screen.getByText('Electrical')).toBeInTheDocument()
        })
    })

    describe('remove trade — immediate, no save needed', () => {
        it('removes assigned trade immediately via onRemove callback', async () => {
            const user = userEvent.setup()
            renderComponent()

            // Click the X button on the assigned Plumbing trade
            const removeButton = screen.getByRole('button', {name: /remove plumbing/i})
            await act(async () => await user.click(removeButton))

            // Assert: removeTrade.mutate called with the trade category ID
            await waitFor(() => {
                expect(mockRemoveMutate).toHaveBeenCalledTimes(1)
            })
            expect(mockRemoveMutate).toHaveBeenCalledWith(
                1,  // plumbing's trade_category_id
                expect.objectContaining({onSuccess: expect.any(Function)})
            )
        })

        it('updates assigned trades list after successful removal', async () => {
            const user = userEvent.setup()
            renderComponent()

            const removeButton = screen.getByRole('button', {name: /remove plumbing/i})
            await act(async () => await user.click(removeButton))

            // Capture the onSuccess callback
            const [, options] = mockRemoveMutate.mock.calls[0]

            // Simulate successful removal (empty trades array)
            await act(async () => {
                options.onSuccess([])
            })

            // Plumbing should no longer be in assigned section
            await waitFor(() => {
                expect(screen.queryByRole('button', {name: /remove plumbing/i})).not.toBeInTheDocument()
            })

            // Badge should show 0/5
            expect(screen.getByText('0/5 Selected')).toBeInTheDocument()
        })
    })

    describe('max trades constraint', () => {
        it('disables adding trades when 5 trades are already assigned', async () => {

            // Profile with 5 trades already assigned
            const maxedProfile: WorkerProfileWithTradesRead = {
                ...mockWorker(1),
                trade_categories: [
                    {id: 1, worker_profile_id: 1, trade_category_id: 1, skill_level: 'mid', trade_category: {id: 1, name: 'plumbing', display_name: 'Plumbing', icon_name: 'wrench', parent_id: null, created_at: ''}},
                    {id: 2, worker_profile_id: 1, trade_category_id: 2, skill_level: 'mid', trade_category: {id: 2, name: 'electrical', display_name: 'Electrical', icon_name: 'zap', parent_id: null, created_at: ''}},
                    {id: 3, worker_profile_id: 1, trade_category_id: 3, skill_level: 'mid', trade_category: {id: 3, name: 'carpentry', display_name: 'Carpentry', icon_name: 'hammer', parent_id: null, created_at: ''}},
                    {id: 4, worker_profile_id: 1, trade_category_id: 4, skill_level: 'mid', trade_category: {id: 4, name: 'hvac', display_name: 'HVAC', icon_name: 'fan', parent_id: null, created_at: ''}},
                    {id: 5, worker_profile_id: 1, trade_category_id: 5, skill_level: 'mid', trade_category: {id: 5, name: 'painting', display_name: 'Painting', icon_name: 'paintbrush', parent_id: null, created_at: ''}},
                ],
            }

            // Mock available trades to include the 5 assigned + 1 extra
            vi.mocked(useTrades).mockReturnValue({
                data: [
                    ...mockTradeCategories,
                    {id: 4, name: 'hvac', display_name: 'HVAC', icon_name: 'fan', parent_id: null, created_at: ''},
                    {id: 5, name: 'painting', display_name: 'Painting', icon_name: 'paintbrush', parent_id: null, created_at: ''},
                ],
                isLoading: false,
            } as any)

            await act(async () => renderComponent(maxedProfile))

            // Badge shows 5/5 with destructive variant
            const badge = screen.getByText('5/5 Selected')
            expect(badge).toBeInTheDocument()
            expect(badge).toHaveClass("bg-destructive/10");
            expect(badge).toHaveClass("text-destructive");

            const selectableSection = document.querySelector('.border-dashed')
            expect(selectableSection).not.toBeInTheDocument()

            // Verify all 5 assigned trades have remove buttons
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /remove electrical/i})).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /remove carpentry/i})).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /remove hvac/i})).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /remove painting/i})).toBeInTheDocument()
        })
    })
})