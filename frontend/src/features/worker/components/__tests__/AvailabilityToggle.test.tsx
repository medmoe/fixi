// src/features/worker/components/__tests__/AvailabilityToggle.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AvailabilityToggle } from '../AvailabilityToggle'
import { useAvailabilityToggle } from '../../hooks/useAvailabilityToggle'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useAvailabilityToggle')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WORKER_ID = 1
const mockToggle = vi.fn()

const renderComponent = (props: { workerId?: number; isAvailable?: boolean } = {}) => {
    return render(
        <AvailabilityToggle
            workerId={props.workerId ?? WORKER_ID}
            isAvailable={props.isAvailable ?? false}
        />
    )
}


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AvailabilityToggle', () => {
    beforeEach(() => {
        vi.clearAllMocks()

        vi.mocked(useAvailabilityToggle).mockReturnValue({
            mutate: mockToggle,
            isPending: false,
        } as any)
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the label', () => {
            renderComponent()
            expect(screen.getByText('Operations Dispatch State')).toBeInTheDocument()
        })

        it('renders the switch', () => {
            renderComponent()
            expect(screen.getByRole('switch', { name: /availability toggle/i })).toBeInTheDocument()
        })

        it('renders offline status text when not available', () => {
            renderComponent({ isAvailable: false })
            expect(screen.getByText('You are offline (hidden from client maps)')).toBeInTheDocument()
        })

        it('renders online status text when available', () => {
            renderComponent({ isAvailable: true })
            expect(screen.getByText('You are online & visible to discovery engines')).toBeInTheDocument()
        })

        it('renders the status indicator dot', () => {
            renderComponent()
            // aria-hidden dot indicator
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toBeInTheDocument()
        })
    })

    // ─── Switch state ─────────────────────────────────────────────────────────

    describe('switch state', () => {
        it('switch is unchecked when isAvailable is false', () => {
            renderComponent({ isAvailable: false })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })
            expect(switchEl).toHaveAttribute('aria-checked', 'false')
        })

        it('switch is checked when isAvailable is true', () => {
            renderComponent({ isAvailable: true })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })
            expect(switchEl).toHaveAttribute('aria-checked', 'true')
        })

        it('switch is not disabled when not pending', () => {
            renderComponent()
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })
            expect(switchEl).not.toBeDisabled()
        })

        it('switch is disabled when mutation is pending', () => {
            vi.mocked(useAvailabilityToggle).mockReturnValue({
                mutate: mockToggle,
                isPending: true,
            } as any)

            renderComponent()
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })
            expect(switchEl).toBeDisabled()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('switch has aria-label', () => {
            renderComponent()
            expect(screen.getByLabelText('Availability toggle')).toBeInTheDocument()
        })

        it('switch has aria-checked false when offline', () => {
            renderComponent({ isAvailable: false })
            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
        })

        it('switch has aria-checked true when online', () => {
            renderComponent({ isAvailable: true })
            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
        })

        it('label is associated with switch via htmlFor', () => {
            renderComponent()
            const label = screen.getByText('Operations Dispatch State').closest('label')
            expect(label).toHaveAttribute('for', 'availability-switch')
            expect(screen.getByRole('switch')).toHaveAttribute('id', 'availability-switch')
        })

        it('status dot is hidden from screen readers', () => {
            renderComponent()
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveAttribute('aria-hidden', 'true')
        })
    })

    // ─── Status indicator dot ─────────────────────────────────────────────────

    describe('status indicator dot', () => {
        it('dot has emerald color class when online', () => {
            renderComponent({ isAvailable: true })
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveClass('bg-emerald-500')
        })

        it('dot has muted color class when offline', () => {
            renderComponent({ isAvailable: false })
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveClass('bg-muted-foreground')
        })

        it('dot has animate-pulse class when online', () => {
            renderComponent({ isAvailable: true })
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveClass('animate-pulse')
        })

        it('dot does not have animate-pulse class when offline', () => {
            renderComponent({ isAvailable: false })
            const dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).not.toHaveClass('animate-pulse')
        })
    })

    // ─── Toggle interaction ───────────────────────────────────────────────────

    describe('toggle interaction', () => {
        it('calls toggle with true when switching on', async () => {
            renderComponent({ isAvailable: false })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledWith(true)
        })

        it('calls toggle with false when switching off', async () => {
            renderComponent({ isAvailable: true })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledWith(false)
        })

        it('calls toggle exactly once per click', async () => {
            renderComponent({ isAvailable: false })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledTimes(1)
        })

        it('does not call toggle when disabled', async () => {
            vi.mocked(useAvailabilityToggle).mockReturnValue({
                mutate: mockToggle,
                isPending: true,
            } as any)

            renderComponent({ isAvailable: false })
            const switchEl = screen.getByRole('switch', { name: /availability toggle/i })

            await userEvent.click(switchEl)

            expect(mockToggle).not.toHaveBeenCalled()
        })

        it('calls useAvailabilityToggle with correct workerId', () => {
            renderComponent({ workerId: 42 })
            expect(useAvailabilityToggle).toHaveBeenCalledWith(42)
        })
    })

    // ─── Pending state ────────────────────────────────────────────────────────

    describe('pending state', () => {
        beforeEach(() => {
            vi.mocked(useAvailabilityToggle).mockReturnValue({
                mutate: mockToggle,
                isPending: true,
            } as any)
        })

        it('disables switch during pending', () => {
            renderComponent()
            expect(screen.getByRole('switch')).toBeDisabled()
        })

        it('still shows correct online status text during pending', () => {
            renderComponent({ isAvailable: true })
            expect(
                screen.getByText('You are online & visible to discovery engines')
            ).toBeInTheDocument()
        })

        it('still shows correct offline status text during pending', () => {
            renderComponent({ isAvailable: false })
            expect(
                screen.getByText('You are offline (hidden from client maps)')
            ).toBeInTheDocument()
        })
    })

    // ─── isAvailable prop changes ─────────────────────────────────────────────

    describe('isAvailable prop changes', () => {
        it('updates status text when isAvailable changes from false to true', () => {
            const { rerender } = render(
                <AvailabilityToggle workerId={WORKER_ID} isAvailable={false} />
            )
            expect(screen.getByText('You are offline (hidden from client maps)')).toBeInTheDocument()

            rerender(<AvailabilityToggle workerId={WORKER_ID} isAvailable={true} />)

            expect(screen.getByText('You are online & visible to discovery engines')).toBeInTheDocument()
        })

        it('updates status text when isAvailable changes from true to false', () => {
            const { rerender } = render(
                <AvailabilityToggle workerId={WORKER_ID} isAvailable={true} />
            )
            expect(screen.getByText('You are online & visible to discovery engines')).toBeInTheDocument()

            rerender(<AvailabilityToggle workerId={WORKER_ID} isAvailable={false} />)

            expect(screen.getByText('You are offline (hidden from client maps)')).toBeInTheDocument()
        })

        it('updates dot color when isAvailable changes', () => {
            const { rerender } = render(
                <AvailabilityToggle workerId={WORKER_ID} isAvailable={false} />
            )

            let dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveClass('bg-muted-foreground')

            rerender(<AvailabilityToggle workerId={WORKER_ID} isAvailable={true} />)

            dot = document.querySelector('[aria-hidden="true"]')
            expect(dot).toHaveClass('bg-emerald-500')
        })

        it('updates aria-checked when isAvailable changes', () => {
            const { rerender } = render(
                <AvailabilityToggle workerId={WORKER_ID} isAvailable={false} />
            )

            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

            rerender(<AvailabilityToggle workerId={WORKER_ID} isAvailable={true} />)

            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
        })
    })
})