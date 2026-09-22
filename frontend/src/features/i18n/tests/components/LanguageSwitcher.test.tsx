import React, {act} from 'react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {LanguageSwitcher} from '../../components/LanguageSwitcher'
import {useChangeLanguage} from '../../hooks/useChangeLanguage'
import i18n from '@/lib/i18n'

vi.mock('../../hooks/useChangeLanguage')

// Same reasoning/pattern as NotificationBell.test.tsx: the real radix-based
// DropdownMenu doesn't play well with jsdom (no hasPointerCapture/scrollIntoView).
vi.mock('@/components/ui/dropdown-menu', () => {
    const DropdownContext = React.createContext<{ isOpen: boolean; setIsOpen: (fn: (o: boolean) => boolean) => void }>({
        isOpen: false,
        setIsOpen: () => {
        },
    })

    return {
        DropdownMenu: ({children}: { children: React.ReactNode }) => {
            const [isOpen, setIsOpen] = React.useState(false)
            return (
                <DropdownContext.Provider value={{isOpen, setIsOpen}}>
                    <div>{children}</div>
                </DropdownContext.Provider>
            )
        },
        DropdownMenuTrigger: ({children}: { children: React.ReactNode }) => {
            const {setIsOpen} = React.useContext(DropdownContext)
            return React.isValidElement(children)
                ? React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
                    onClick: () => act(() => setIsOpen((o) => !o)),
                })
                : children
        },
        DropdownMenuContent: ({children}: { children: React.ReactNode }) => {
            const {isOpen} = React.useContext(DropdownContext)
            return isOpen ? <div role="menu">{children}</div> : null
        },
        DropdownMenuItem: ({children, onClick, ...rest}: { children: React.ReactNode; onClick?: () => void }) => (
            <div role="menuitem" onClick={onClick} {...rest}>{children}</div>
        ),
    }
})

const changeLanguageMock = vi.fn()

describe('LanguageSwitcher', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        vi.mocked(useChangeLanguage).mockReturnValue(changeLanguageMock)
        await i18n.changeLanguage('fr')
    })

    afterEach(async () => {
        // Wrapped in act() -- the previous test's tree is still mounted at
        // this point (RTL's own cleanup afterEach hasn't run yet), and this
        // resets i18next's active language, which react-i18next reacts to.
        await act(async () => {
            await i18n.changeLanguage('fr')
        })
    })

    it('renders a trigger button labeled in the active language', () => {
        render(<LanguageSwitcher/>)
        expect(screen.getByLabelText('Changer de langue')).toBeInTheDocument()
    })

    it('lists every supported language when opened', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher/>)

        await user.click(screen.getByLabelText('Changer de langue'))

        expect(screen.getByRole('menuitem', {name: 'Français'})).toBeInTheDocument()
        expect(screen.getByRole('menuitem', {name: 'العربية'})).toBeInTheDocument()
        expect(screen.getByRole('menuitem', {name: 'English'})).toBeInTheDocument()
    })

    it('marks the active language as current', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher/>)

        await user.click(screen.getByLabelText('Changer de langue'))

        expect(screen.getByRole('menuitem', {name: 'Français'})).toHaveAttribute('aria-current', 'true')
        expect(screen.getByRole('menuitem', {name: 'العربية'})).toHaveAttribute('aria-current', 'false')
        expect(screen.getByRole('menuitem', {name: 'English'})).toHaveAttribute('aria-current', 'false')
    })

    it('calls useChangeLanguage with the selected language', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher/>)

        await user.click(screen.getByLabelText('Changer de langue'))
        await user.click(screen.getByRole('menuitem', {name: 'العربية'}))

        expect(changeLanguageMock).toHaveBeenCalledWith('ar')
    })

    it('renders in Arabic once the active language switches', async () => {
        await i18n.changeLanguage('ar')
        render(<LanguageSwitcher/>)

        expect(screen.getByLabelText('تغيير اللغة')).toBeInTheDocument()
    })

    it('calls useChangeLanguage with English when selected', async () => {
        const user = userEvent.setup()
        render(<LanguageSwitcher/>)

        await user.click(screen.getByLabelText('Changer de langue'))
        await user.click(screen.getByRole('menuitem', {name: 'English'}))

        expect(changeLanguageMock).toHaveBeenCalledWith('en')
    })
})
