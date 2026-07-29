// src/features/worker/components/__tests__/AvailabilityToggle.test.tsx

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {AvailabilityToggle} from '@/features/worker/components/AvailabilityToggle'
import {useAvailabilityToggle} from '@/features/worker/hooks/useAvailabilityToggle'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/worker/hooks/useAvailabilityToggle')

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockToggle = vi.fn()

const renderComponent = (props: { isAvailable?: boolean } = {}) => {
    return render(
        <AvailabilityToggle
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
            expect(screen.getByText(/currently offline/i)).toBeInTheDocument()
        })

        it('renders the switch', () => {
            renderComponent()
            expect(screen.getByTestId('availability-switch')).toBeInTheDocument()
        })

        it('renders offline status text when not available', () => {
            renderComponent({isAvailable: false})
            expect(screen.getByText(/hidden from client searches/i)).toBeInTheDocument()
        })

        it('renders online status text when available', () => {
            renderComponent({isAvailable: true})
            expect(screen.getByText(/visible to clients in discovery/i)).toBeInTheDocument()
        })

        it('renders the status indicator dot', () => {
            renderComponent()
            expect(screen.getByRole('switch', {name: /availability toggle/i})).toBeInTheDocument();
        })
    })

    // ─── Switch state ─────────────────────────────────────────────────────────

    describe('switch state', () => {
        it('switch is unchecked when isAvailable is false', () => {
            renderComponent({isAvailable: false})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})
            expect(switchEl).toHaveAttribute('aria-checked', 'false')
        })

        it('switch is checked when isAvailable is true', () => {
            renderComponent({isAvailable: true})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})
            expect(switchEl).toHaveAttribute('aria-checked', 'true')
        })

        it('switch is not disabled when not pending', () => {
            renderComponent()
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})
            expect(switchEl).not.toBeDisabled()
        })

        it('switch is disabled when mutation is pending', () => {
            vi.mocked(useAvailabilityToggle).mockReturnValue({
                mutate: mockToggle,
                isPending: true,
            } as any)

            renderComponent()
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})
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
            renderComponent({isAvailable: false})
            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
        })

        it('switch has aria-checked true when online', () => {
            renderComponent({isAvailable: true})
            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
        })

        it('label is associated with switch via htmlFor', () => {
            renderComponent()
            const label = screen.getByText(/currently offline/i).closest('label')
            expect(label).toHaveAttribute('for', 'availability-switch')
            expect(screen.getByRole('switch')).toHaveAttribute('id', 'availability-switch')
        })
    })

    // ─── Toggle interaction ───────────────────────────────────────────────────

    describe('toggle interaction', () => {
        it('calls toggle with true when switching on', async () => {
            renderComponent({isAvailable: false})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledWith(true)
        })

        it('calls toggle with false when switching off', async () => {
            renderComponent({isAvailable: true})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledWith(false)
        })

        it('calls toggle exactly once per click', async () => {
            renderComponent({isAvailable: false})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})

            await userEvent.click(switchEl)

            expect(mockToggle).toHaveBeenCalledTimes(1)
        })

        it('does not call toggle when disabled', async () => {
            vi.mocked(useAvailabilityToggle).mockReturnValue({
                mutate: mockToggle,
                isPending: true,
            } as any)

            renderComponent({isAvailable: false})
            const switchEl = screen.getByRole('switch', {name: /availability toggle/i})

            await userEvent.click(switchEl)

            expect(mockToggle).not.toHaveBeenCalled()
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
            renderComponent({isAvailable: true})
            expect(
                screen.getByText(/visible to clients in discovery/i)
            ).toBeInTheDocument()
        })

        it('still shows correct offline status text during pending', () => {
            renderComponent({isAvailable: false})
            expect(
                screen.getByText(/hidden from client searches/i)
            ).toBeInTheDocument()
        })
    })

    // ─── isAvailable prop changes ─────────────────────────────────────────────

    describe('isAvailable prop changes', () => {
        it('updates status text when isAvailable changes from false to true', () => {
            const {rerender} = render(
                <AvailabilityToggle isAvailable={false}/>
            )
            expect(screen.getByText(/hidden from client searches/i)).toBeInTheDocument()

            rerender(<AvailabilityToggle isAvailable={true}/>)

            expect(screen.getByText(/visible to clients in discovery/i)).toBeInTheDocument()
        })

        it('updates status text when isAvailable changes from true to false', () => {
            const {rerender} = render(
                <AvailabilityToggle isAvailable={true}/>
            )
            expect(screen.getByText(/visible to clients in discovery/i)).toBeInTheDocument()

            rerender(<AvailabilityToggle isAvailable={false}/>)

            expect(screen.getByText(/hidden from client searches/i)).toBeInTheDocument()
        })

        it('updates aria-checked when isAvailable changes', () => {
            const {rerender} = render(
                <AvailabilityToggle isAvailable={false}/>
            )

            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')

            rerender(<AvailabilityToggle isAvailable={true}/>)

            expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
        })
    })
})