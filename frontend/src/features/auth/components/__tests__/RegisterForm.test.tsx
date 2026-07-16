// src/features/auth/__tests__/RegisterForm.test.tsx
import React, {act} from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {RegisterForm} from '@/features/auth/components/RegisterForm'
import {useRegister} from '@/features/auth/hooks/useRegister'
import {renderWithProviders} from '@/test/renderWithProviders'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth/hooks/useRegister')
vi.mock('@/components/ui/select', () => {
    const SelectContext = React.createContext<any>({})

    return {
        Select: ({children, value, onValueChange}: any) => {
            const [isOpen, setIsOpen] = React.useState(false)
            return (
                <SelectContext.Provider value={{value, onValueChange, isOpen, setIsOpen}}>
                    <div>{children}</div>
                </SelectContext.Provider>
            )
        },
        SelectTrigger: ({children, 'aria-label': ariaLabel}: any) => {
            const {isOpen, setIsOpen} = React.useContext(SelectContext)
            return (
                <button
                    role="combobox"
                    aria-label={ariaLabel}
                    aria-expanded={isOpen}
                    onClick={() => {
                        act(() => {
                            setIsOpen((o: boolean) => !o)
                        })
                    }}
                >
                    {children}
                </button>
            )
        },
        SelectValue: ({placeholder}: any) => {
            const {value} = React.useContext(SelectContext)
            const labels: Record<string, string> = {
                customer: 'Customer — I need services',
                worker: 'Worker — I offer services',
            }
            return <span>{value ? labels[value] : placeholder}</span>
        },
        SelectContent: ({children}: any) => {
            const {isOpen} = React.useContext(SelectContext)
            return isOpen ? <div role="listbox">{children}</div> : null
        },
        SelectItem: ({children, value}: any) => {
            const {onValueChange, setIsOpen} = React.useContext(SelectContext)
            return (
                <div
                    role="option"
                    onClick={() => {
                        act(() => {
                            onValueChange?.(value);
                            setIsOpen(false)
                        })
                    }}
                >
                    {children}
                </div>
            )
        },
    }
})

const mockMutate = vi.fn()

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterForm', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useRegister).mockReturnValue({
            mutate: mockMutate,
            isPending: false,
        } as any)
    })

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders all form fields', async () => {
            await act(async () => {
                renderWithProviders(<RegisterForm/>)
            })
            expect(screen.getByLabelText('Full name')).toBeInTheDocument()
            expect(screen.getByLabelText('Username')).toBeInTheDocument()
            expect(screen.getByLabelText('Email address')).toBeInTheDocument()
            expect(screen.getByLabelText('Password')).toBeInTheDocument()
        })

        it('renders role selector', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(screen.getByRole('combobox', {name: /select role/i})).toBeInTheDocument()
        })

        it('renders submit button', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(screen.getByRole('button', {name: /create account/i})).toBeInTheDocument()
        })

        it('renders login link', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(screen.getByRole('link', {name: /sign in/i})).toBeInTheDocument()
        })

        it('defaults role to customer', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(screen.getByText('Customer — I need services')).toBeInTheDocument()
        })

        it('does not show spinner when idle', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
        })
    })

    // ─── Pending state ────────────────────────────────────────────────────────

    describe('pending state', () => {
        beforeEach(() => {
            vi.mocked(useRegister).mockReturnValue({
                mutate: mockMutate,
                isPending: true,
            } as any)
        })

        it('shows spinner when pending', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(document.querySelector('.animate-spin')).toBeInTheDocument()
        })

        it('disables submit button when pending', async () => {
            renderWithProviders(<RegisterForm/>)
            expect(screen.getByRole('button', {name: /create account/i})).toBeDisabled()
        })
    })

    // ─── Validation ───────────────────────────────────────────────────────────

    describe('validation', () => {
        it('shows error when name is too short', async () => {
            renderWithProviders(<RegisterForm/>)
            const user = userEvent.setup()
            const nameInput = screen.getByLabelText('Full name')
            await act(async () => await user.type(nameInput, 'J'))
            const button = screen.getByRole('button', {name: /create account/i})
            await act(async () => await user.click(button))

            await screen.findByText(/name must be at least 2 characters/i)
        })

        it('shows error for invalid email', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Full name'), 'John Doe')
                await userEvent.type(screen.getByLabelText('Username'), 'johndoe')
                await userEvent.type(screen.getByLabelText('Email address'), 'not-an-email')
                await userEvent.type(screen.getByLabelText('Password'), 'Secure123**')
                await userEvent.click(screen.getByRole('button', {name: /create account/i}))
            })

            await screen.findByText(/invalid email address/i)
        })

        it('shows error when password has no digit', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Full name'), 'John Doe')
                await userEvent.type(screen.getByLabelText('Username'), 'johndoe')
                await userEvent.type(screen.getByLabelText('Email address'), 'john@example.com')
                await userEvent.type(screen.getByLabelText('Password'), 'NoDigitPass')
                await userEvent.click(screen.getByRole('button', {name: /create account/i}))
            })

            await screen.findByText(/password must contain at least one digit/i)
        })

        it('shows error when password has no capital letter', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Full name'), 'John Doe')
                await userEvent.type(screen.getByLabelText('Username'), 'johndoe')
                await userEvent.type(screen.getByLabelText('Email address'), 'john@example.com')
                await userEvent.type(screen.getByLabelText('Password'), 'nouppercase1')
                await userEvent.click(screen.getByRole('button', {name: /create account/i}))
            })

            await screen.findByText(/password must contain at least one capital letter/i)
        })

        it('does not call mutate when form is invalid', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /create account/i}))
            })

            expect(mockMutate).not.toHaveBeenCalled()
        })
    })

    // ─── Role selection ───────────────────────────────────────────────────────

    describe('role selection', () => {
        it('can select worker role', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.click(screen.getByRole('combobox', {name: /select role/i}))
            })
            await act(async () => await userEvent.click(await screen.findByRole('option', {name: /worker/i})))

            await waitFor(() => expect(screen.getByText('Worker — I offer services')).toBeInTheDocument())

        })

        it('can select customer role', async () => {
            const user = userEvent.setup()

            renderWithProviders(<RegisterForm/>)

            await act(async () => await user.click(screen.getByRole('combobox', {name: /select role/i})))
            const customerOption = await screen.findByRole('option', {name: /customer/i})
            await act(async () => await user.click(customerOption))
            const selectedText = await screen.findByText('Customer — I need services')
            expect(selectedText).toBeInTheDocument()


        })
    })

    // ─── Submission ───────────────────────────────────────────────────────────

    describe('submission', () => {
        it('calls mutate with correct payload on valid submit', async () => {
            renderWithProviders(<RegisterForm/>)

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Full name'), 'John Doe')
                await userEvent.type(screen.getByLabelText('Username'), 'johndoe')
                await userEvent.type(screen.getByLabelText('Email address'), 'john@example.com')
                await userEvent.type(screen.getByLabelText('Password'), 'Secure123**')
                await userEvent.click(screen.getByRole('button', {name: /create account/i}))
            })


            await waitFor(() => {
                    expect(mockMutate).toHaveBeenCalledTimes(1)
                    expect(mockMutate).toHaveBeenCalledWith({
                        name: 'John Doe',
                        username: 'johndoe',
                        email: 'john@example.com',
                        password: 'Secure123**',
                        role_type: 'customer',
                    })
                }
            )
        })

        it('submits with worker role when selected', async () => {
            const user = userEvent.setup()
            renderWithProviders(<RegisterForm/>)

            await act(async () => await user.click(screen.getByRole('combobox', {name: /select role/i})))
            const optionWorker = await screen.findByRole('option', {name: /worker/i})
            await act(async () => await user.click(optionWorker))
            await act(async () => {
                await user.type(screen.getByLabelText('Full name'), 'John Doe')
                await user.type(screen.getByLabelText('Username'), 'johndoe')
                await user.type(screen.getByLabelText('Email address'), 'john@example.com')
                await user.type(screen.getByLabelText('Password'), 'Secure123**')
            })
            await act(async () => await user.click(screen.getByRole('button', {name: /create account/i})))


            await waitFor(() => {
                    expect(mockMutate).toHaveBeenCalledTimes(1)
                    expect(mockMutate).toHaveBeenCalledWith(
                        expect.objectContaining({role_type: 'worker'})
                    )
                }
            )
        })
    })
})