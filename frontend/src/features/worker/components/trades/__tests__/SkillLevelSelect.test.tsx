import React from 'react'
import {describe, expect, it, vi} from 'vitest'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {SkillLevelSelect} from '@/features/worker/components/trades/SkillLevelSelect'
import {type SkillLevel} from '@/features/worker/types'

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/select', () => {
    const SelectContext = React.createContext<any>({})

    return {
        Select: ({children, value, onValueChange}: any) => {
            const [isOpen, setIsOpen] = React.useState(false)
            React.useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                    if (e.key === 'Escape') setIsOpen(false)
                }
                document.addEventListener('keydown', handleKeyDown)
                return () => document.removeEventListener('keydown', handleKeyDown)
            }, [])
            return (
                <SelectContext.Provider value={{value, onValueChange, isOpen, setIsOpen}}>
                    <div>{children}</div>
                </SelectContext.Provider>
            )
        },
        SelectTrigger: ({children, 'aria-label': ariaLabel, className}: any) => {
            const {isOpen, setIsOpen} = React.useContext(SelectContext)
            return (
                <button
                    role="combobox"
                    aria-label={ariaLabel}
                    aria-expanded={isOpen}
                    className={className}
                    onClick={() => setIsOpen((o: boolean) => !o)}
                >
                    {children}
                </button>
            )
        },
        SelectValue: ({placeholder}: any) => {
            const {value} = React.useContext(SelectContext)
            return <span>{value || placeholder}</span>
        },
        SelectContent: ({children}: any) => {
            const {isOpen} = React.useContext(SelectContext)
            // ✅ only render when open
            return isOpen ? <div role="listbox">{children}</div> : null
        },
        SelectItem: ({children, value}: any) => {
            const {value: selectedValue, onValueChange, setIsOpen} = React.useContext(SelectContext)
            return (
                <div
                    role="option"
                    aria-selected={selectedValue === value}
                    onClick={() => {
                        onValueChange?.(value)
                        setIsOpen(false)  // ✅ close after selection
                    }}
                >
                    {children}
                </div>
            )
        },
    }
})// ─── Helpers ──────────────────────────────────────────────────────────────────

const defaultProps = {
    value: '' as SkillLevel,
    onChange: vi.fn(),
    tradeName: 'Plumbing',
}

const renderComponent = (props: Partial<typeof defaultProps> = {}) => {
    return render(<SkillLevelSelect {...defaultProps} {...props} />)
}

const getTrigger = () => screen.getByRole('combobox', {name: /skill level for/i})
const openDropdown = async () => await act(async () => await userEvent.click(getTrigger()))


// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SkillLevelSelect', () => {

    // ─── Rendering ────────────────────────────────────────────────────────────

    describe('rendering', () => {
        it('renders the select trigger', () => {
            renderComponent()
            expect(getTrigger()).toBeInTheDocument()
        })

        it('renders placeholder when no value selected', () => {
            renderComponent({value: '' as SkillLevel})
            expect(screen.getByText('Select Level')).toBeInTheDocument()
        })

        it('renders selected value junior', () => {
            renderComponent({value: 'junior'})
            expect(screen.getByText(/junior/i)).toBeInTheDocument()
        })

        it('renders selected value mid', () => {
            renderComponent({value: 'mid'})
            expect(screen.getByText(/mid/i)).toBeInTheDocument()
        })

        it('renders selected value senior', () => {
            renderComponent({value: 'senior'})
            expect(screen.getByText(/senior/i)).toBeInTheDocument()
        })

        it('renders all three options when opened', async () => {
            renderComponent()
            await openDropdown()
            expect(screen.getByRole('option', {name: 'Junior'})).toBeInTheDocument()
            expect(screen.getByRole('option', {name: 'Mid-level'})).toBeInTheDocument()
            expect(screen.getByRole('option', {name: 'Senior'})).toBeInTheDocument()
        })

        it('dropdown is closed by default', () => {
            renderComponent()
            expect(screen.queryByRole('option', {name: 'Junior'})).not.toBeInTheDocument()
        })
    })

    // ─── Accessibility ────────────────────────────────────────────────────────

    describe('accessibility', () => {
        it('trigger has aria-label with trade name', () => {
            renderComponent({tradeName: 'Plumbing'})
            expect(screen.getByLabelText('Skill level for Plumbing')).toBeInTheDocument()
        })

        it('aria-label updates when tradeName changes', () => {
            renderComponent({tradeName: 'Electrical'})
            expect(screen.getByLabelText('Skill level for Electrical')).toBeInTheDocument()
        })

        it('trigger has correct role combobox', () => {
            renderComponent()
            expect(getTrigger()).toHaveAttribute('role', 'combobox')
        })

        it('trigger has aria-expanded false when closed', () => {
            renderComponent()
            expect(getTrigger()).toHaveAttribute('aria-expanded', 'false')
        })

        it('trigger has aria-expanded true when opened', async () => {
            renderComponent()
            await openDropdown()
            expect(getTrigger()).toHaveAttribute('aria-expanded', 'true')
        })
    })

    // ─── Selection ────────────────────────────────────────────────────────────

    describe('selection', () => {
        it('calls onChange with junior when junior is selected', async () => {
            const onChange = vi.fn()
            renderComponent({onChange, value: '' as SkillLevel})

            await openDropdown()
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'Junior'})))

            expect(onChange).toHaveBeenCalledWith('junior')
        })

        it('calls onChange with mid when mid-level is selected', async () => {
            const onChange = vi.fn()
            renderComponent({onChange, value: '' as SkillLevel})

            await openDropdown()
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'Mid-level'})))

            expect(onChange).toHaveBeenCalledWith('mid')
        })

        it('calls onChange with senior when senior is selected', async () => {
            const onChange = vi.fn()
            renderComponent({onChange, value: '' as SkillLevel})

            await openDropdown()
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'Senior'})))

            expect(onChange).toHaveBeenCalledWith('senior')
        })

        it('calls onChange exactly once per selection', async () => {
            const onChange = vi.fn()
            renderComponent({onChange, value: '' as SkillLevel})

            await openDropdown()
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'Junior'})))

            expect(onChange).toHaveBeenCalledTimes(1)
        })

        it('does not call onChange when dropdown opens without selection', async () => {
            const onChange = vi.fn()
            renderComponent({onChange})

            await openDropdown()

            expect(onChange).not.toHaveBeenCalled()
        })

        it('closes dropdown after selection', async () => {
            renderComponent()

            await openDropdown()
            await act(async () => await userEvent.click(screen.getByRole('option', {name: 'Senior'})))

            expect(screen.queryByRole('option', {name: 'Junior'})).not.toBeInTheDocument()
        })
    })

    // ─── Trade name variations ────────────────────────────────────────────────

    describe('trade name variations', () => {
        it('renders correctly with Electrical trade name', () => {
            renderComponent({tradeName: 'Electrical'})
            expect(screen.getByLabelText('Skill level for Electrical')).toBeInTheDocument()
        })

        it('renders correctly with Carpentry trade name', () => {
            renderComponent({tradeName: 'Carpentry'})
            expect(screen.getByLabelText('Skill level for Carpentry')).toBeInTheDocument()
        })

        it('renders correctly with long trade name', () => {
            renderComponent({tradeName: 'Air Conditioning and Refrigeration'})
            expect(
                screen.getByLabelText('Skill level for Air Conditioning and Refrigeration')
            ).toBeInTheDocument()
        })
    })

    // ─── Value changes ────────────────────────────────────────────────────────

    describe('value changes', () => {
        it('reflects updated value prop', () => {
            const {rerender} = render(
                <SkillLevelSelect value="junior" onChange={vi.fn()} tradeName="Plumbing"/>
            )
            expect(screen.getByText(/junior/i)).toBeInTheDocument()

            rerender(
                <SkillLevelSelect value="senior" onChange={vi.fn()} tradeName="Plumbing"/>
            )
            expect(screen.getByText(/senior/i)).toBeInTheDocument()
        })

        it('shows placeholder when value is reset to empty', () => {
            const {rerender} = render(
                <SkillLevelSelect value="junior" onChange={vi.fn()} tradeName="Plumbing"/>
            )
            expect(screen.getByText(/junior/i)).toBeInTheDocument()

            rerender(
                <SkillLevelSelect value={'' as SkillLevel} onChange={vi.fn()} tradeName="Plumbing"/>
            )
            expect(screen.getByText('Select Level')).toBeInTheDocument()
        })
    })

    // ─── Keyboard navigation ──────────────────────────────────────────────────

    describe('keyboard navigation', () => {
        it('opens dropdown on Enter key', async () => {
            renderComponent()
            const trigger = getTrigger()

            trigger.focus()
            await act(async () => await userEvent.keyboard('{Enter}'))

            expect(screen.getByRole('option', {name: 'Junior'})).toBeInTheDocument()
        })

        it('opens dropdown on Space key', async () => {
            renderComponent()
            const trigger = getTrigger()

            trigger.focus()
            await act(async () => await userEvent.keyboard(' '))

            expect(screen.getByRole('option', {name: 'Junior'})).toBeInTheDocument()
        })

        it('closes dropdown on Escape key', async () => {
            renderComponent()

            await openDropdown()
            expect(screen.getByRole('option', {name: 'Junior'})).toBeInTheDocument()

            await act(async () => await userEvent.keyboard('{Escape}'))
            expect(screen.queryByRole('option', {name: 'Junior'})).not.toBeInTheDocument()
        })
    })
})