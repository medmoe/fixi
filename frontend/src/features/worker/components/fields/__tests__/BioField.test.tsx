// src/features/worker/components/__tests__/BioField.test.tsx

import {describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {FormProvider, useForm} from 'react-hook-form'
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'
import {BioField} from '../BioField'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// vi.mock('@/components/ui/form', () => ({
//     FormField: ({render, control, name}: any) => {
//         // simulate react-hook-form's render prop pattern
//         const {useController} = require('react-hook-form')
//         const {field} = useController({name, control})
//         return render({field})
//     },
//     FormItem: ({children}: any) => <div>{children}</div>,
//     FormLabel: ({children, htmlFor}: any) => <label htmlFor={htmlFor}>{children}</label>,
//     FormControl: ({children}: any) => <div>{children}</div>,
//     FormMessage: () => null,
// }))

// vi.mock('@/components/ui/textarea', async () => {
//     const React = await import('react');
//     return {
//         Textarea: React.forwardRef<HTMLTextAreaElement, any>((props, ref) => (
//             <textarea ref={ref} {...props} />
//         )),
//     };
// });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const bioSchema = z.object({
    bio: z.string().max(500, {message: 'Bio cannot exceed 500 characters'}).optional().or(z.literal('')),
})

type BioFormValues = z.infer<typeof bioSchema>

// wrap BioField in a real FormProvider — it uses useFormContext internally
const renderWithForm = (defaultValues: BioFormValues = {bio: ''}) => {
    const Wrapper = () => {
        const methods = useForm<BioFormValues>({
            resolver: zodResolver(bioSchema),
            defaultValues,
        })
        return (
            <FormProvider {...methods}>
                <form>
                    <BioField/>
                </form>
            </FormProvider>
        )
    }
    return render(<Wrapper/>)
}


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BioField', () => {

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the label', () => {
            renderWithForm()
            expect(screen.getByText('Professional Bio')).toBeInTheDocument()
        })

        it('renders the textarea', () => {
            renderWithForm()
            expect(screen.getByRole('textbox', {name: /bio/i})).toBeInTheDocument()
        })

        it('renders the character counter starting at 0/500', () => {
            renderWithForm()
            expect(screen.getByText('0/500 chars')).toBeInTheDocument()
        })

        it('renders the placeholder text', () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})
            expect(textarea).toHaveAttribute(
                'placeholder',
                'Tell clients about your expertise, machinery ownership, and experience...'
            )
        })

        it('renders with existing bio value', () => {
            renderWithForm({bio: 'Experienced plumber'})
            const textarea = screen.getByRole('textbox', {name: /bio/i})
            expect(textarea).toHaveValue('Experienced plumber')
        })

        it('renders character count reflecting initial bio value', () => {
            renderWithForm({bio: 'Hello'})
            expect(screen.getByText('5/500 chars')).toBeInTheDocument()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('textarea has aria-label', () => {
            renderWithForm()
            expect(screen.getByLabelText('Bio')).toBeInTheDocument()
        })

        it('label is associated with textarea via htmlFor', () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})
            expect(textarea).toHaveAttribute('id', 'worker-bio')
            expect(screen.getByText('Professional Bio').closest('label'))
                .toHaveAttribute('for', 'worker-bio')
        })

        it('character counter has aria-live="polite"', () => {
            renderWithForm()
            const counter = screen.getByText('0/500 chars')
            expect(counter).toHaveAttribute('aria-live', 'polite')
        })
    })

    // ─── Character counter ────────────────────────────────────────────────────

    describe('character counter', () => {
        it('updates counter as user types', async () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'Hello')
            })

            expect(screen.getByText('5/500 chars')).toBeInTheDocument()
        })

        it('updates counter on each keystroke', async () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'Hi')
            })
            expect(screen.getByText('2/500 chars')).toBeInTheDocument()

            await act(async () => {
                await userEvent.type(textarea, '!')
            })
            expect(screen.getByText('3/500 chars')).toBeInTheDocument()
        })

        it('shows correct count at exactly 500 characters', async () => {
            renderWithForm({bio: 'a'.repeat(500)})
            expect(screen.getByText('500/500 chars')).toBeInTheDocument()
        })

        it('counter decrements when text is deleted', async () => {
            renderWithForm({bio: 'Hello'})
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.clear(textarea)
            })

            expect(screen.getByText('0/500 chars')).toBeInTheDocument()
        })

        it('shows 0/500 when bio is empty string', () => {
            renderWithForm({bio: ''})
            expect(screen.getByText('0/500 chars')).toBeInTheDocument()
        })
    })

    // ─── Counter color ────────────────────────────────────────────────────────

    describe('counter color', () => {
        it('counter has muted color when under limit', async () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'Short bio')
            })

            const counter = screen.getByText('9/500 chars')
            expect(counter).toHaveClass('text-muted-foreground')
            expect(counter).not.toHaveClass('text-destructive')
        })

        it('counter has muted color at exactly 500 characters', () => {
            renderWithForm({bio: 'a'.repeat(500)})
            const counter = screen.getByText('500/500 chars')
            expect(counter).toHaveClass('text-muted-foreground')
            expect(counter).not.toHaveClass('text-destructive')
        })

        it('counter turns destructive and bold when over 500 characters', async () => {
            // bypass zod max to simulate over-limit state in the UI
            renderWithForm({bio: 'a'.repeat(501)})
            const counter = screen.getByText('501/500 chars')
            expect(counter).toHaveClass('text-destructive')
            expect(counter).toHaveClass('font-bold')
        })

        it('counter reverts to muted when text is reduced below limit', async () => {
            renderWithForm({bio: 'a'.repeat(501)})
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            // delete one character to go back under limit
            await act(async () => {
                await userEvent.type(textarea, '{Backspace}')
            })

            const counter = screen.getByText('500/500 chars')
            expect(counter).toHaveClass('text-muted-foreground')
            expect(counter).not.toHaveClass('text-destructive')
        })
    })

    // ─── User interaction ─────────────────────────────────────────────────────

    describe('user interaction', () => {
        it('textarea is editable', async () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'My professional bio')
            })

            expect(textarea).toHaveValue('My professional bio')
        })

        it('textarea can be cleared', async () => {
            renderWithForm({bio: 'Some existing bio'})
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.clear(textarea)
            })

            expect(textarea).toHaveValue('')
            expect(screen.getByText('0/500 chars')).toBeInTheDocument()
        })

        it('textarea accepts multiline input', async () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'Line one{Enter}Line two')
            })

            expect(textarea).toHaveValue('Line one\nLine two')
        })

        it('textarea is not disabled by default', () => {
            renderWithForm()
            const textarea = screen.getByRole('textbox', {name: /bio/i})
            expect(textarea).not.toBeDisabled()
        })
    })

    // ─── Form integration ─────────────────────────────────────────────────────

    describe('form integration', () => {
        it('shows validation error message when bio exceeds 500 chars on submit', async () => {
            const Wrapper = () => {
                const methods = useForm<BioFormValues>({
                    resolver: zodResolver(bioSchema),
                    defaultValues: {bio: ''},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(() => {
                        })}>
                            <BioField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            const textarea = screen.getByRole('textbox', {name: /bio/i})
            await act(async () => {
                await userEvent.type(textarea, 'a'.repeat(501))
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            // FormMessage renders zod validation error
            await screen.findByText(/bio cannot exceed 500 characters/i)
        })

        it('submits successfully with valid bio', async () => {
            const onSubmit = vi.fn()
            const Wrapper = () => {
                const methods = useForm<BioFormValues>({
                    resolver: zodResolver(bioSchema),
                    defaultValues: {bio: ''},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <BioField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            const textarea = screen.getByRole('textbox', {name: /bio/i})

            await act(async () => {
                await userEvent.type(textarea, 'Valid bio text')
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).toHaveBeenCalledWith(
                {bio: 'Valid bio text'},
                expect.anything(),
            )
        })

        it('submits successfully with empty bio', async () => {
            const onSubmit = vi.fn()
            const Wrapper = () => {
                const methods = useForm<BioFormValues>({
                    resolver: zodResolver(bioSchema),
                    defaultValues: {bio: ''},
                })
                return (
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <BioField/>
                            <button type="submit">Submit</button>
                        </form>
                    </FormProvider>
                )
            }
            render(<Wrapper/>)

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit/i}))
            })

            expect(onSubmit).toHaveBeenCalledWith({bio: ''}, expect.anything())
        })
    })
})