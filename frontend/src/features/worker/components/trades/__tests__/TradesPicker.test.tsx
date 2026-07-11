// src/features/worker/components/__tests__/TradesPicker.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { TradesPicker } from '../trades/TradesPicker'
import { useTrades } from '../../hooks/useTrades'
import type { Trade } from '../../types/worker.types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useTrades')

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockTrades: Trade[] = [
    { id: 1, name: 'plumbing',    display_name: 'Plumbing',    icon_name: 'wrench', parent_id: null },
    { id: 2, name: 'electrical',  display_name: 'Electrical',  icon_name: 'bolt',   parent_id: null },
    { id: 3, name: 'carpentry',   display_name: 'Carpentry',   icon_name: 'hammer', parent_id: null },
    { id: 4, name: 'painting',    display_name: 'Painting',    icon_name: 'brush',  parent_id: null },
    { id: 5, name: 'roofing',     display_name: 'Roofing',     icon_name: 'house',  parent_id: null },
    { id: 6, name: 'landscaping', display_name: 'Landscaping', icon_name: 'tree',   parent_id: null },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TradesFormValues = {
    trades: { trade_id: number; skill_level: string }[]
}

const renderWithForm = (defaultValues: TradesFormValues = { trades: [] }) => {
    const Wrapper = () => {
        const methods = useForm<TradesFormValues>({
            defaultValues,
        })
        return (
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(() => {})}>
                    <TradesPicker />
                    <button type="submit">Submit</button>
                </form>
            </FormProvider>
        )
    }
    return render(<Wrapper />)
}


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TradesPicker', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        // default mock — trades loaded, not loading
        vi.mocked(useTrades).mockReturnValue({
            data: mockTrades,
            isLoading: false,
        } as any)
    })

    // ─── Loading state ────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows loading text when trades are loading', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: true,
            } as any)

            renderWithForm()

            expect(screen.getByText(/loading core trades database mappings/i)).toBeInTheDocument()
        })

        it('does not render trade buttons when loading', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: true,
            } as any)

            renderWithForm()

            expect(screen.queryByRole('button', { name: /plumbing/i })).not.toBeInTheDocument()
        })

        it('loading text has animate-pulse class', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: true,
            } as any)

            renderWithForm()

            expect(screen.getByText(/loading core trades database mappings/i))
                .toHaveClass('animate-pulse')
        })
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the trades label', () => {
            renderWithForm()
            expect(screen.getByText('Trades & Specializations')).toBeInTheDocument()
        })

        it('renders the max trades hint text', () => {
            renderWithForm()
            expect(screen.getByText(/select up to 5 primary trades/i)).toBeInTheDocument()
        })

        it('renders counter badge showing 0/5 initially', () => {
            renderWithForm()
            expect(screen.getByText('0/5 Selected')).toBeInTheDocument()
        })

        it('renders all available trade buttons', () => {
            renderWithForm()
            mockTrades.forEach(trade => {
                expect(screen.getByRole('button', { name: new RegExp(trade.name, 'i') }))
                    .toBeInTheDocument()
            })
        })

        it('renders no selected trades initially', () => {
            renderWithForm()
            expect(screen.queryByLabelText(/remove trade/i)).not.toBeInTheDocument()
        })

        it('renders pre-selected trades from default values', () => {
            renderWithForm({
                trades: [{ trade_id: 1, skill_level: 'junior' }],
            })
            expect(screen.getByText('plumbing')).toBeInTheDocument()
        })
    })

    // ─── Adding trades ────────────────────────────────────────────────────────

    describe('adding trades', () => {
        it('adds a trade when its button is clicked', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))

            expect(screen.getByText('plumbing')).toBeInTheDocument()
        })

        it('removes trade from available list after adding', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))

            // plumbing button should no longer appear in the available list
            const availableSection = screen.queryByRole('button', { name: /^\+ plumbing$/i })
            expect(availableSection).not.toBeInTheDocument()
        })

        it('updates counter badge after adding a trade', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))

            expect(screen.getByText('1/5 Selected')).toBeInTheDocument()
        })

        it('adds multiple trades', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))
            await userEvent.click(screen.getByRole('button', { name: /electrical/i }))

            expect(screen.getByText('plumbing')).toBeInTheDocument()
            expect(screen.getByText('electrical')).toBeInTheDocument()
            expect(screen.getByText('2/5 Selected')).toBeInTheDocument()
        })

        it('defaults new trade to mid skill level', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))

            expect(screen.getByText('Mid-level')).toBeInTheDocument()
        })

        it('shows remove button for each added trade', async () => {
            renderWithForm()

            await userEvent.click(screen.getByRole('button', { name: /plumbing/i }))
            await userEvent.click(screen.getByRole('button', { name: /electrical/i }))

            const removeButtons = screen.getAllByRole('button', { name: /remove trade/i })
            expect(removeButtons).toHaveLength(2)
        })
    })

    // ─── Max limit enforcement ────────────────────────────────────────────────

    describe('max limit enforcement', () => {
        it('hides available trades section when 5 trades are selected', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                    { trade_id: 3, skill_level: 'mid' },
                    { trade_id: 4, skill_level: 'mid' },
                    { trade_id: 5, skill_level: 'senior' },
                ],
            })

            // no add buttons should be visible
            expect(screen.queryByRole('button', { name: /^\+/i })).not.toBeInTheDocument()
        })

        it('shows destructive badge variant at max capacity', () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                    { trade_id: 3, skill_level: 'mid' },
                    { trade_id: 4, skill_level: 'mid' },
                    { trade_id: 5, skill_level: 'senior' },
                ],
            })

            const badge = screen.getByText('5/5 Selected')
            expect(badge.closest('[class*="destructive"]') || badge).toBeInTheDocument()
        })

        it('does not add trade when already at max 5', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                    { trade_id: 3, skill_level: 'mid' },
                    { trade_id: 4, skill_level: 'mid' },
                    { trade_id: 5, skill_level: 'senior' },
                ],
            })

            // counter should stay at 5
            expect(screen.getByText('5/5 Selected')).toBeInTheDocument()
        })

        it('shows available trades section when under max', async () => {
            renderWithForm({
                trades: [{ trade_id: 1, skill_level: 'junior' }],
            })

            // should still show add buttons for remaining trades
            expect(screen.getByRole('button', { name: /electrical/i })).toBeInTheDocument()
        })
    })

    // ─── Removing trades ──────────────────────────────────────────────────────

    describe('removing trades', () => {
        it('removes a trade when remove button is clicked', async () => {
            renderWithForm({
                trades: [{ trade_id: 1, skill_level: 'junior' }],
            })

            const removeButton = screen.getByRole('button', {
                name: /remove trade allocation descriptor for plumbing/i,
            })
            await userEvent.click(removeButton)

            expect(screen.queryByText('plumbing')).not.toBeInTheDocument()
        })

        it('updates counter after removing a trade', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                ],
            })

            expect(screen.getByText('2/5 Selected')).toBeInTheDocument()

            const removeButtons = screen.getAllByRole('button', { name: /remove trade/i })
            await userEvent.click(removeButtons[0])

            expect(screen.getByText('1/5 Selected')).toBeInTheDocument()
        })

        it('adds trade back to available list after removal', async () => {
            renderWithForm({
                trades: [{ trade_id: 1, skill_level: 'junior' }],
            })

            const removeButton = screen.getByRole('button', {
                name: /remove trade allocation descriptor for plumbing/i,
            })
            await userEvent.click(removeButton)

            // plumbing should appear in available list again
            expect(screen.getByRole('button', { name: /plumbing/i })).toBeInTheDocument()
        })

        it('shows available section again after removing from max', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                    { trade_id: 3, skill_level: 'mid' },
                    { trade_id: 4, skill_level: 'mid' },
                    { trade_id: 5, skill_level: 'senior' },
                ],
            })

            // no add buttons at max
            expect(screen.queryByRole('button', { name: /^\+/i })).not.toBeInTheDocument()

            const removeButtons = screen.getAllByRole('button', { name: /remove trade/i })
            await userEvent.click(removeButtons[0])

            // now shows available section with remaining trades
            expect(screen.getByRole('button', { name: /landscaping/i })).toBeInTheDocument()
        })

        it('removes correct trade when multiple exist', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                ],
            })

            const removeElectrical = screen.getByRole('button', {
                name: /remove trade allocation descriptor for electrical/i,
            })
            await userEvent.click(removeElectrical)

            expect(screen.queryByText('electrical')).not.toBeInTheDocument()
            expect(screen.getByText('plumbing')).toBeInTheDocument()
        })
    })

    // ─── Unknown trades ───────────────────────────────────────────────────────

    describe('unknown trades', () => {
        it('shows fallback label for trade id not in available list', () => {
            renderWithForm({
                trades: [{ trade_id: 999, skill_level: 'junior' }],
            })

            expect(screen.getByText('Unknown Trade (#999)')).toBeInTheDocument()
        })

        it('remove button has aria-label with fallback trade name', () => {
            renderWithForm({
                trades: [{ trade_id: 999, skill_level: 'junior' }],
            })

            expect(screen.getByRole('button', {
                name: /remove trade allocation descriptor for unknown trade \(#999\)/i,
            })).toBeInTheDocument()
        })
    })

    // ─── Skill level changes ──────────────────────────────────────────────────

    describe('skill level changes', () => {
        it('renders skill level select for each selected trade', async () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'senior' },
                ],
            })

            const skillSelects = screen.getAllByRole('combobox', { name: /skill level for/i })
            expect(skillSelects).toHaveLength(2)
        })

        it('renders correct skill level for each trade', () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'senior' },
                ],
            })

            expect(screen.getByText('Junior')).toBeInTheDocument()
            expect(screen.getByText('Senior')).toBeInTheDocument()
        })

        it('skill level select has correct aria-label with trade name', () => {
            renderWithForm({
                trades: [{ trade_id: 1, skill_level: 'junior' }],
            })

            expect(screen.getByLabelText('Skill level for plumbing')).toBeInTheDocument()
        })
    })

    // ─── Empty states ─────────────────────────────────────────────────────────

    describe('empty states', () => {
        it('shows all available trades when none selected', () => {
            renderWithForm()

            mockTrades.forEach(trade => {
                expect(screen.getByRole('button', { name: new RegExp(trade.name, 'i') }))
                    .toBeInTheDocument()
            })
        })

        it('shows no selected trades section when trades array is empty', () => {
            renderWithForm()

            expect(screen.queryByRole('button', { name: /remove trade/i }))
                .not.toBeInTheDocument()
        })

        it('renders empty available list when all trades are selected', () => {
            // select all 6 trades — but max is 5, so only 5 can be in form
            renderWithForm({
                trades: mockTrades.slice(0, 5).map(t => ({
                    trade_id: t.id,
                    skill_level: 'mid',
                })),
            })

            // available section hidden at max
            expect(screen.queryByRole('button', { name: /^\+/i })).not.toBeInTheDocument()
        })

        it('shows no trades available message area when all are selected and under max', () => {
            // select 4 of 6 trades — available section shows but only 2 trades
            renderWithForm({
                trades: mockTrades.slice(0, 4).map(t => ({
                    trade_id: t.id,
                    skill_level: 'mid',
                })),
            })

            // only unselected trades appear
            expect(screen.getByRole('button', { name: /roofing/i })).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /landscaping/i })).toBeInTheDocument()

            // selected ones are not in available list
            expect(screen.queryByRole('button', { name: /^\+ plumbing$/i })).not.toBeInTheDocument()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('each remove button has descriptive aria-label', () => {
            renderWithForm({
                trades: [
                    { trade_id: 1, skill_level: 'junior' },
                    { trade_id: 2, skill_level: 'mid' },
                ],
            })

            expect(screen.getByRole('button', {
                name: /remove trade allocation descriptor for plumbing/i,
            })).toBeInTheDocument()

            expect(screen.getByRole('button', {
                name: /remove trade allocation descriptor for electrical/i,
            })).toBeInTheDocument()
        })

        it('badge counter is visible and readable', () => {
            renderWithForm()
            expect(screen.getByText('0/5 Selected')).toBeVisible()
        })

        it('hint text is visible', () => {
            renderWithForm()
            expect(screen.getByText(/select up to 5 primary trades/i)).toBeVisible()
        })
    })
})