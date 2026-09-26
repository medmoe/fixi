import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter} from 'react-router-dom'
import type {WorkerBillingRead} from '@/features/worker'
import {BillingTab} from '../../components/BillingTab'
import {useDownloadInvoice, useMyBilling} from '../../hooks'

vi.mock('../../hooks', () => ({useMyBilling: vi.fn(), useDownloadInvoice: vi.fn()}))

const record = (overrides: Partial<WorkerBillingRead>): WorkerBillingRead => ({
    id: 1, worker_profile_id: 1, job_id: 11, amount_owed: '500.00', amount_paid: '0.00',
    due_date: '2026-10-01T00:00:00Z', status: 'pending', is_overdue: false, payment_id: null,
    invoice_key: null, created_at: '2026-09-01T00:00:00Z', updated_at: null, ...overrides,
})

const renderTab = () => render(<MemoryRouter><BillingTab/></MemoryRouter>)

describe('BillingTab', () => {
    const mutate = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useDownloadInvoice).mockReturnValue({mutate, isPending: false, variables: undefined} as any)
    })

    it('shows an error message when loading fails', () => {
        vi.mocked(useMyBilling).mockReturnValue({data: undefined, isLoading: false, isError: true} as any)
        renderTab()
        expect(screen.getByText("Couldn't load your billing history. Please try again later.")).toBeInTheDocument()
    })

    it('shows a zero outstanding total and the empty state with no records', () => {
        vi.mocked(useMyBilling).mockReturnValue({data: [], isLoading: false, isError: false} as any)
        renderTab()

        expect(screen.getByTestId('billing-outstanding').textContent).toMatch(/0/)
        expect(screen.getByText(/No commission yet/)).toBeInTheDocument()
    })

    it('sums only unpaid balances into the outstanding total', () => {
        vi.mocked(useMyBilling).mockReturnValue({
            data: [
                record({id: 1, amount_owed: '500.00', amount_paid: '0.00', status: 'pending'}),
                record({id: 2, amount_owed: '300.00', amount_paid: '100.00', status: 'pending'}),
                record({id: 3, amount_owed: '900.00', amount_paid: '900.00', status: 'paid'}),
            ],
            isLoading: false,
            isError: false,
        } as any)
        renderTab()

        // 500 + (300 - 100) = 700; the paid record doesn't count.
        expect(screen.getByTestId('billing-outstanding').textContent).toMatch(/700/)
        expect(screen.getAllByTestId('billing-row')).toHaveLength(3)
    })

    it('flags overdue records and counts them', () => {
        vi.mocked(useMyBilling).mockReturnValue({
            data: [record({id: 1, is_overdue: true}), record({id: 2, status: 'paid'})],
            isLoading: false,
            isError: false,
        } as any)
        renderTab()

        expect(screen.getByText('1 payment overdue')).toBeInTheDocument()
        const rows = screen.getAllByTestId('billing-row')
        expect(within(rows[0]).getByText('Overdue')).toBeInTheDocument()
        expect(within(rows[1]).getByText('Paid')).toBeInTheDocument()
    })

    it('links each record to its job and downloads its invoice', async () => {
        vi.mocked(useMyBilling).mockReturnValue({data: [record({id: 4, job_id: 11})], isLoading: false, isError: false} as any)
        renderTab()

        expect(screen.getByRole('link', {name: 'Job #11'})).toHaveAttribute('href', '/jobs/11')
        await userEvent.click(screen.getByRole('button', {name: 'Download invoice for job #11'}))
        expect(mutate).toHaveBeenCalledWith(4)
    })
})
