// src/features/worker/components/__tests__/HourlyRateField.test.tsx

import {describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {FormProvider, useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {HourlyRateField} from '@/features/worker/components/fields/HourlyRateField.tsx'

// ─── Schema ───────────────────────────────────────────────────────────────────

const hourlyRateSchema = z.object({
    hourly_rate: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().positive({message: 'Hourly rate must be greater than 0'}).optional()
    ),
})

type HourlyRateFormValues = z.input<typeof hourlyRateSchema>


// ─── Helpers ──────────────────────────────────────────────────────────────────
const onSubmit = vi.fn()
const renderWithForm = (defaultValues: HourlyRateFormValues = {}) => {

    const Wrapper = () => {
        const methods = useForm<HourlyRateFormValues>({
            resolver: zodResolver(hourlyRateSchema),
            defaultValues: {
                hourly_rate: '' as any,
                ...defaultValues
            },
        })
        return (
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <HourlyRateField/>
                    <button type="submit">Submit</button>
                </form>
            </FormProvider>
        )
    }
    return render(<Wrapper/>)
}

const getInput = () => screen.getByRole('spinbutton', {name: /hourly rate/i})


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('HourlyRateField', () => {

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the label', () => {
            renderWithForm()
            expect(screen.getByText('Hourly Rate')).toBeInTheDocument()
        })

        it('renders the number input', () => {
            renderWithForm()
            expect(getInput()).toBeInTheDocument()
        })

        it('renders the currency symbol $', () => {
            renderWithForm()
            expect(screen.getByText('$')).toBeInTheDocument()
        })

        it('renders the per hour suffix / hr', () => {
            renderWithForm()
            expect(screen.getByText('/ hr')).toBeInTheDocument()
        })

        it('renders placeholder 0.00', () => {
            renderWithForm()
            expect(getInput()).toHaveAttribute('placeholder', '0.00')
        })

        it('renders with correct input type number', () => {
            renderWithForm()
            expect(getInput()).toHaveAttribute('type', 'number')
        })

        it('renders with step 0.01 for decimal support', () => {
            renderWithForm()
            expect(getInput()).toHaveAttribute('step', '0.01')
        })

        it('renders with min 0.01', () => {
            renderWithForm()
            expect(getInput()).toHaveAttribute('min', '0.01')
        })

        it('renders with existing hourly rate value', () => {
            renderWithForm({hourly_rate: 75.00})
            expect(getInput()).toHaveValue(75)
        })

        it('renders empty when no default value', () => {
            renderWithForm()
            expect(getInput()).toHaveValue(null)
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('input has aria-label', () => {
            renderWithForm()
            expect(screen.getByLabelText('Hourly rate')).toBeInTheDocument()
        })

        it('label is associated with input via htmlFor', () => {
            renderWithForm()
            const input = getInput()
            expect(input).toHaveAttribute('id', 'hourly-rate-input')
            expect(screen.getByText('Hourly Rate').closest('label'))
                .toHaveAttribute('for', 'hourly-rate-input')
        })

        it('currency symbol is not interactive — pointer events none', () => {
            renderWithForm()
            const currencyWrapper = screen.getByText('$').parentElement
            expect(currencyWrapper).toHaveClass('pointer-events-none')
        })

        it('suffix is not interactive — pointer events none', () => {
            renderWithForm()
            const suffixWrapper = screen.getByText('/ hr').parentElement
            expect(suffixWrapper).toHaveClass('pointer-events-none')
        })
    })

    // ─── User interaction ─────────────────────────────────────────────────────

    describe('user interaction', () => {
        it('accepts valid positive number input', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '75')
            })

            expect(input).toHaveValue(75)
        })

        it('accepts decimal values', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '49.99')
            })

            expect(input).toHaveValue(49.99)
        })

        it('accepts value at minimum 0.01', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '0.01')
            })

            expect(input).toHaveValue(0.01)
        })

        it('can be cleared', async () => {
            renderWithForm({hourly_rate: 75})
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
            })

            expect(input).toHaveValue(null)
        })

        it('can update value from existing', async () => {
            renderWithForm({hourly_rate: 50})
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '100')
            })

            expect(input).toHaveValue(100)
        })

        it('input is not disabled by default', () => {
            renderWithForm()
            expect(getInput()).not.toBeDisabled()
        })
    })

    // ─── Form validation ──────────────────────────────────────────────────────

    describe('form validation', () => {
        it('shows error message when submitting zero', async () => {
            renderWithForm()
            const input = getInput()

            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '0')
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })
            expect(onSubmit).not.toHaveBeenCalled()
        })

        it('shows error message when submitting negative value', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '-10')
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })
            expect(onSubmit).not.toHaveBeenCalled()

        })

        it('does not show error with valid positive value', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '75.00')
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(screen.queryByText(/hourly rate must be greater than 0/i)).not.toBeInTheDocument()
        })

        it('does not show error when field is empty', async () => {
            renderWithForm()
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            // optional field — empty is valid
            expect(screen.queryByText(/hourly rate must be greater than 0/i)).not.toBeInTheDocument()
        })

        it('submits correct value on valid input', async () => {
            renderWithForm()
            const input = getInput()
            await act(async () => {
                await userEvent.clear(input)
                await userEvent.type(input, '75.50')
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).toHaveBeenCalledWith(
                {hourly_rate: 75.50},
                expect.anything(),
            )
        })

        it('submits undefined when field is empty', async () => {
            renderWithForm()
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).toHaveBeenCalledWith(
                {hourly_rate: undefined},
                expect.anything(),
            )
        })
    })
})