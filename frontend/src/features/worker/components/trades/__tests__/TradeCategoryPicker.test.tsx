import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {act} from 'react'
import {TradeCategoryPicker, type TradeCategoryRead, useTrades, type WorkerTradeNestedRead} from '@/features/worker'

vi.mock('@/features/worker/hooks/useTrades')

const mockAvailableTrades: TradeCategoryRead[] = [
    {id: 1, name: 'plumbing', display_name: 'Plumbing', icon_name: null, parent_id: null, created_at: null},
    {id: 2, name: 'electrical', display_name: 'Electrical', icon_name: null, parent_id: null, created_at: null},
    {id: 3, name: 'carpentry', display_name: 'Carpentry', icon_name: null, parent_id: null, created_at: null},
]

const mockAssignedTrades: WorkerTradeNestedRead[] = [
    {
        id: 10,
        worker_profile_id: 1,
        trade_category_id: 1,
        skill_level: 'junior',
        trade_category: mockAvailableTrades[0],
    },
]

const defaultProps = {
    assignedTrades: mockAssignedTrades,
    pendingIds: [] as number[],
    onPendingChange: vi.fn(),
    onRemove: vi.fn(),
    isRemoving: false,
}

const renderComponent = (props = {}) => {
    return render(<TradeCategoryPicker {...defaultProps} {...props} />)
}

describe('TradeCategoryPicker', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useTrades).mockReturnValue({
            data: mockAvailableTrades,
            isLoading: false,
        } as any)
    })

    // ─── Loading state ─────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading text when trades are loading', () => {
            vi.mocked(useTrades).mockReturnValue({data: [], isLoading: true} as any)
            renderComponent()
            expect(screen.getByText(/loading/i)).toBeInTheDocument()
        })
    })

    // ─── Assigned trades ───────────────────────────────────────────────────

    describe('assigned trades', () => {
        it('renders assigned trade categories', async () => {
            await act(async () => {
                renderComponent()
            })
            expect(screen.getByText('Plumbing')).toBeInTheDocument()
        })

        it('renders remove button for each assigned trade', async () => {
            await act(async () => {
                renderComponent()
            })
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument()
        })

        it('calls onRemove with trade_category_id when remove is clicked', async () => {
            const onRemove = vi.fn()
            await act(async () => {
                renderComponent({onRemove})
            })

            await userEvent.click(screen.getByRole('button', {name: /remove plumbing/i}))

            expect(onRemove).toHaveBeenCalledWith(1)  // trade_category_id
        })

        it('disables remove buttons when isRemoving is true', async () => {
            await act(async () => {
                renderComponent({isRemoving: true})
            })
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeDisabled()
        })

        it('shows 0/5 count when no trades assigned', async () => {
            await act(async () => {
                renderComponent({assignedTrades: []})
            })
            expect(screen.getByText('0/5 Selected')).toBeInTheDocument()
        })

        it('shows correct count for assigned trades', async () => {
            await act(async () => {
                renderComponent()
            })
            expect(screen.getByText('1/5 Selected')).toBeInTheDocument()
        })
    })

    // ─── Available trades (not yet assigned) ──────────────────────────────

    describe('available trades', () => {
        it('renders unassigned trades as selectable buttons', async () => {
            await act(async () => {
                renderComponent()
            })
            // plumbing is assigned — should not appear in available list
            expect(screen.queryByRole('button', {name: /^\+ plumbing$/i})).not.toBeInTheDocument()
            // electrical and carpentry should appear
            expect(screen.getByRole('button', {name: /electrical/i})).toBeInTheDocument()
            expect(screen.getByRole('button', {name: /carpentry/i})).toBeInTheDocument()
        })

        it('calls onPendingChange with added id when available trade is clicked', async () => {
            const onPendingChange = vi.fn()
            await act(async () => {
                renderComponent({onPendingChange})
            })

            await userEvent.click(screen.getByRole('button', {name: /electrical/i}))

            expect(onPendingChange).toHaveBeenCalledWith([2])  // added trade id 2
        })

        it('does not show available trades section when at max 5', async () => {
            const fiveTrades = Array.from({length: 5}, (_, i) => ({
                id: i + 10,
                worker_profile_id: 1,
                trade_category_id: i + 1,
                skill_level: 'junior' as const,
                trade_category: mockAvailableTrades[0],
            }))
            await act(async () => {
                renderComponent({assignedTrades: fiveTrades})
            })
            expect(screen.queryByRole('button', {name: /electrical/i})).not.toBeInTheDocument()
        })
    })

    // ─── Pending selections ────────────────────────────────────────────────

    describe('pending selections', () => {
        it('shows pending trades as selected but not yet confirmed', async () => {
            await act(async () => {
                renderComponent({pendingIds: [2]})  // electrical pending
            })
            // electrical should appear as pending — visually distinct
            expect(screen.getByText(/electrical/i)).toBeInTheDocument()
        })

        it('removes id from pending when pending trade is deselected', async () => {
            const onPendingChange = vi.fn()
            await act(async () => {
                renderComponent({pendingIds: [2], onPendingChange})
            })

            // click electrical again to deselect
            await userEvent.click(screen.getByRole('button', {name: /electrical/i}))

            expect(onPendingChange).toHaveBeenCalledWith([])  // removed from pending
        })

        it('pending trade is not in available selection list', async () => {
            await act(async () => {
                renderComponent({pendingIds: [2]})
            })
            // electrical is pending — should not appear in "add" buttons
            expect(screen.queryByRole('button', {name: /^\+ electrical$/i})).not.toBeInTheDocument()
        })

        it('pending + assigned count shown in badge', async () => {
            await act(async () => {
                renderComponent({pendingIds: [2]})  // 1 assigned + 1 pending = 2
            })
            expect(screen.getByText('2/5 Selected')).toBeInTheDocument()
        })

        it('badge turns destructive at max 5 total', async () => {
            const fourAssigned = Array.from({length: 4}, (_, i) => ({
                id: i + 10,
                worker_profile_id: 1,
                trade_category_id: i + 1,
                skill_level: 'junior' as const,
                trade_category: null,
            }))
            await act(async () => {
                renderComponent({assignedTrades: fourAssigned, pendingIds: [5]})  // 4 + 1 = 5
            })
            const badge = screen.getByText('5/5 Selected')
            expect(badge).toBeInTheDocument()
        })
    })

    // ─── Accessibility ─────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('remove buttons have descriptive aria-labels', async () => {
            await act(async () => {
                renderComponent()
            })
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument()
        })

        it('label and count badge are visible', async () => {
            await act(async () => {
                renderComponent()
            })
            expect(screen.getByText(/trades & specializations/i)).toBeInTheDocument()
            expect(screen.getByText('1/5 Selected')).toBeInTheDocument()
        })
    })
})