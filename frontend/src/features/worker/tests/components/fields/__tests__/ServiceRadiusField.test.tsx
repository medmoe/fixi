// src/features/worker/components/__tests__/ServiceRadiusField.test.tsx

import {describe, expect, it, vi} from 'vitest'
import {act, fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {FormProvider, useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {ServiceRadiusField} from '../../../../components/fields/ServiceRadiusField.tsx'


// ─── Mocks ───────────────────────────────────────────────────────────────────


vi.mock('@/components/ui/slider', () => ({
    Slider: ({
                 value,
                 onValueChange,
                 min,
                 max,
                 step,
                 'aria-label': ariaLabel,
                 'aria-valuemin': ariaValuemin,
                 'aria-valuemax': ariaValuemax,
                 'aria-valuenow': ariaValuenow
             }: any) => (
        <input
            type="range"
            role="slider"
            aria-label={ariaLabel}          // ✅ directly on the slider element
            aria-valuemin={ariaValuemin}
            aria-valuemax={ariaValuemax}
            aria-valuenow={ariaValuenow}
            value={value?.[0] ?? 1}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onValueChange?.([Number(e.target.value)])}
        />
    ),
}))

// ─── Schema ───────────────────────────────────────────────────────────────────

const serviceRadiusSchema = z.object({
    service_radius_km: z.preprocess(
        (val) => (val === '' || val === undefined ? undefined : Number(val)),
        z.number().int().min(1).max(500).optional()
    ),
})

type ServiceRadiusFormValues = z.input<typeof serviceRadiusSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderWithForm = (defaultValues: ServiceRadiusFormValues = {}) => {
    const Wrapper = () => {
        const methods = useForm<ServiceRadiusFormValues>({
            resolver: zodResolver(serviceRadiusSchema),
            defaultValues,
        })
        return (
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(() => {
                })}>
                    <ServiceRadiusField/>
                    <button type="submit">Submit</button>
                </form>
            </FormProvider>
        )
    }
    return render(<Wrapper/>)
}

const getSlider = () => screen.getByRole('slider', {name: /service radius/i})


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ServiceRadiusField', () => {

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the label', () => {
            renderWithForm()
            expect(screen.getByText('Service Radius')).toBeInTheDocument()
        })

        it('renders the slider', () => {
            renderWithForm()
            expect(getSlider()).toBeInTheDocument()
        })

        it('renders default radius value of 25 km when no default provided', () => {
            renderWithForm()
            expect(screen.getByText('25 km')).toBeInTheDocument()
        })

        it('renders provided default radius value', () => {
            renderWithForm({service_radius_km: 50})
            expect(screen.getByText('50 km')).toBeInTheDocument()
        })

        it('renders km badge with correct value', () => {
            renderWithForm({service_radius_km: 100})
            const badge = screen.getByText('100 km')
            expect(badge).toBeInTheDocument()
        })

        it('renders km badge with minimum value 1', () => {
            renderWithForm({service_radius_km: 1})
            expect(screen.getByText('1 km')).toBeInTheDocument()
        })

        it('renders km badge with maximum value 500', () => {
            renderWithForm({service_radius_km: 500})
            expect(screen.getByText('500 km')).toBeInTheDocument()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('slider has aria-label', () => {
            renderWithForm()
            expect(screen.getByLabelText('Service radius')).toBeInTheDocument()
        })

        it('slider has aria-valuemin of 1', () => {
            renderWithForm()
            expect(getSlider()).toHaveAttribute('aria-valuemin', '1')
        })

        it('slider has aria-valuemax of 500', () => {
            renderWithForm()
            expect(getSlider()).toHaveAttribute('aria-valuemax', '500')
        })

        it('slider has aria-valuenow reflecting current value', () => {
            renderWithForm({service_radius_km: 75})
            expect(getSlider()).toHaveAttribute('aria-valuenow', '75')
        })

        it('slider has aria-valuenow of 25 when no default provided', () => {
            renderWithForm()
            expect(getSlider()).toHaveAttribute('aria-valuenow', '25')
        })

        it('slider aria-valuenow updates after value change', async () => {
            renderWithForm({service_radius_km: 25})
            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 26}}))
            expect(screen.getByText('26 km')).toBeInTheDocument()
        })
    })

    // ─── Slider constraints ───────────────────────────────────────────────────

    describe('slider constraints', () => {
        it('does not go below minimum of 1', async () => {
            renderWithForm({service_radius_km: 1})
            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 0}}))

            expect(slider).toHaveAttribute('aria-valuenow', '1')
            expect(screen.getByText('1 km')).toBeInTheDocument()
        })

        it('does not go above maximum of 500', async () => {
            renderWithForm({service_radius_km: 500})
            const slider = getSlider()

            await act(() => fireEvent.change(slider, {target: {value: 501}}))
            expect(slider).toHaveAttribute('aria-valuenow', '500')
            expect(screen.getByText('500 km')).toBeInTheDocument()
        })

        it('increments by 1 step on arrow right', async () => {
            renderWithForm({service_radius_km: 25})
            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 26}}))

            expect(slider).toHaveAttribute('aria-valuenow', '26')
            expect(screen.getByText('26 km')).toBeInTheDocument()
        })

        it('decrements by 1 step on arrow left', async () => {
            renderWithForm({service_radius_km: 25})
            const slider = getSlider()

            await act(() => fireEvent.change(slider, {target: {value: 24}}))

            expect(slider).toHaveAttribute('aria-valuenow', '24')
            expect(screen.getByText('24 km')).toBeInTheDocument()
        })

        it('jumps to minimum on Home key', async () => {
            renderWithForm({service_radius_km: 250})
            const slider = getSlider()

            await act(() => fireEvent.change(slider, {target: {value: 1}}))

            expect(slider).toHaveAttribute('aria-valuenow', '1')
            expect(screen.getByText('1 km')).toBeInTheDocument()
        })

        it('jumps to maximum on End key', async () => {
            renderWithForm({service_radius_km: 25})
            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 500}}))

            expect(getSlider()).toHaveAttribute('aria-valuenow', '500')
            expect(screen.getByText('500 km')).toBeInTheDocument()
        })
    })

    // ─── Badge updates ────────────────────────────────────────────────────────

    describe('km badge updates', () => {
        it('badge updates in sync with slider', async () => {
            renderWithForm({service_radius_km: 25})
            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 28}}))

            expect(screen.getByText('28 km')).toBeInTheDocument()
        })

        it('badge has correct styling classes', () => {
            renderWithForm({service_radius_km: 25})
            const badge = screen.getByText('25 km')
            expect(badge).toHaveClass('text-sm', 'font-medium', 'text-primary', 'rounded-full')
        })
    })

    // ─── Form integration ─────────────────────────────────────────────────────

    describe('form integration', () => {
        it('submits correct radius value', async () => {
            const onSubmit = vi.fn()
            const Wrapper = () => {
                const methods = useForm<ServiceRadiusFormValues>({
                    resolver: zodResolver(serviceRadiusSchema),
                    defaultValues: {service_radius_km: 25},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <ServiceRadiusField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            const slider = getSlider()
            await act(async () => {
                fireEvent.change(slider, {target: {value: 27}})
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).toHaveBeenCalledWith(
                {service_radius_km: 27},
                expect.anything(),
            )
        })

        it('marks form as dirty after slider interaction', async () => {
            const Wrapper = () => {
                const methods = useForm<ServiceRadiusFormValues>({
                    resolver: zodResolver(serviceRadiusSchema),
                    defaultValues: {service_radius_km: 25},
                })
                return (
                    <FormProvider {...methods}>
                        <form>
                            <ServiceRadiusField/>
                            <span data-testid="dirty">
                                {methods.formState.isDirty ? 'dirty' : 'clean'}
                            </span>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            expect(screen.getByTestId('dirty')).toHaveTextContent('clean')

            const slider = getSlider()
            await act(() => fireEvent.change(slider, {target: {value: 11}}))
            expect(screen.getByTestId('dirty')).toHaveTextContent('dirty')
        })

        it('triggers validation after slider interaction', async () => {
            // Simulate a form that has a custom validation
            const strictSchema = z.object({
                service_radius_km: z.preprocess(
                    (val) => Number(val),
                    z.number().int().min(10, {message: 'Minimum radius is 10 km'}).max(500)
                ),
            })
            const onSubmit = vi.fn()

            const Wrapper = () => {
                const methods = useForm({
                    resolver: zodResolver(strictSchema),
                    defaultValues: {service_radius_km: 10},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <ServiceRadiusField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            // move below min
            const slider = getSlider()
            await act(async () => {
                fireEvent.change(slider, {target: {value: 9}})
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).not.toHaveBeenCalled()
            expect(screen.getByText(/minimum radius is 10 km/i)).toBeInTheDocument()

        })

        it('submits undefined when field has no value', async () => {
            const onSubmit = vi.fn()
            const Wrapper = () => {
                const methods = useForm<ServiceRadiusFormValues>({
                    resolver: zodResolver(serviceRadiusSchema),
                    defaultValues: {},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <ServiceRadiusField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            await act(async () => await userEvent.click(screen.getByRole('button', {name: /submit/i})))

            expect(onSubmit).toHaveBeenCalledWith(
                {service_radius_km: undefined},
                expect.anything(),
            )
        })
    })
})