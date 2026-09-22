import React, {act} from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {NotificationBell} from '../../components/NotificationBell'
import {useNotifications} from '../../hooks/useNotifications'
import {useMarkAllNotificationsRead} from '../../hooks/useMarkAllNotificationsRead'
import {useMarkNotificationRead} from '../../hooks/useMarkNotificationRead'
import {usePushRegistration} from '../../hooks/usePushRegistration'
import type {NotificationRead} from '../../types'
import i18n from '@/lib/i18n'

vi.mock('../../hooks/useNotifications')
vi.mock('../../hooks/useMarkAllNotificationsRead')
vi.mock('../../hooks/useMarkNotificationRead')
vi.mock('../../hooks/usePushRegistration')

// The real radix-based DropdownMenu doesn't play well with jsdom (no
// hasPointerCapture/scrollIntoView) -- mocked the same way this codebase
// already mocks Select in RegisterForm.test.tsx.
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
        DropdownMenuItem: ({children, onClick}: { children: React.ReactNode; onClick?: () => void }) => (
            <div role="menuitem" onClick={onClick}>{children}</div>
        ),
        DropdownMenuLabel: ({children}: { children: React.ReactNode }) => <div>{children}</div>,
        DropdownMenuSeparator: () => <hr/>,
    }
})

const buildNotification = (overrides: Partial<NotificationRead> = {}): NotificationRead => ({
    id: 1,
    user_id: 1,
    type: 'job.status_changed',
    title_ar: 'عنوان',
    title_fr: 'Job démarré',
    title_en: 'Job started',
    body_ar: 'نص',
    body_fr: 'Votre job a démarré.',
    body_en: 'Your job has started.',
    read_at: null,
    related_job_id: null,
    created_at: '2026-09-21T10:00:00Z',
    ...overrides,
})

const markReadMock = vi.fn()
const markAllReadMock = vi.fn()

describe('NotificationBell', () => {
    beforeEach(async () => {
        vi.clearAllMocks()
        vi.mocked(usePushRegistration).mockReturnValue(undefined)
        vi.mocked(useMarkNotificationRead).mockReturnValue({mutate: markReadMock} as never)
        vi.mocked(useMarkAllNotificationsRead).mockReturnValue({mutate: markAllReadMock, isPending: false} as never)
        // Explicit rather than relying on i18next's browser-locale detection
        // default -- jsdom's navigator.language ('en-US') now resolves to a
        // real supported language ('en') since English support was added,
        // so tests below that don't care about language selection need a
        // deterministic starting point.
        await i18n.changeLanguage('fr')
    })

    const mockLists = (options: { unreadCount?: number; notifications?: NotificationRead[]; isLoading?: boolean } = {}) => {
        const {unreadCount = 0, notifications = [], isLoading = false} = options
        vi.mocked(useNotifications).mockImplementation(({unreadOnly} = {}) => {
            if (unreadOnly) {
                return {data: {data: [], total_count: unreadCount, has_more: false, page: 1, items_per_page: 1}, isLoading: false} as never
            }
            return {data: {data: notifications, total_count: notifications.length, has_more: false, page: 1, items_per_page: 10}, isLoading} as never
        })
    }

    it('does not show a badge when there are no unread notifications', () => {
        mockLists({unreadCount: 0})
        render(<NotificationBell/>)

        expect(screen.queryByLabelText(/unread notifications/i)).not.toBeInTheDocument()
    })

    it('shows the unread count on the badge', () => {
        mockLists({unreadCount: 3})
        render(<NotificationBell/>)

        expect(screen.getByLabelText('3 unread notifications')).toBeInTheDocument()
    })

    it('caps the badge display at 9+', () => {
        mockLists({unreadCount: 42})
        render(<NotificationBell/>)

        expect(screen.getByLabelText('42 unread notifications')).toHaveTextContent('9+')
    })

    it('shows an empty state when there are no notifications', async () => {
        mockLists({notifications: []})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

        expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument()
    })

    it('shows a loading skeleton while notifications are loading', async () => {
        mockLists({isLoading: true})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

        expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    })

    it('renders each notification title and body', async () => {
        mockLists({notifications: [buildNotification({title_fr: 'Job démarré', body_fr: 'Votre job a démarré.'})]})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

        expect(screen.getByText('Job démarré')).toBeInTheDocument()
        expect(screen.getByText('Votre job a démarré.')).toBeInTheDocument()
    })

    it('marks an unread notification read when clicked', async () => {
        mockLists({notifications: [buildNotification({id: 5, read_at: null})]})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))
        await userEvent.click(screen.getByRole('menuitem'))

        expect(markReadMock).toHaveBeenCalledWith(5)
    })

    it('does not mark an already-read notification read again when clicked', async () => {
        mockLists({notifications: [buildNotification({id: 5, read_at: '2026-09-21T11:00:00Z'})]})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))
        await userEvent.click(screen.getByRole('menuitem'))

        expect(markReadMock).not.toHaveBeenCalled()
    })

    it('hides the "Mark all read" action when there are no unread notifications', async () => {
        mockLists({unreadCount: 0, notifications: [buildNotification({read_at: '2026-09-21T11:00:00Z'})]})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

        expect(screen.queryByRole('button', {name: /mark all read/i})).not.toBeInTheDocument()
    })

    it('calls markAllRead when "Mark all read" is clicked', async () => {
        mockLists({unreadCount: 2, notifications: [buildNotification()]})
        render(<NotificationBell/>)

        await userEvent.click(screen.getByRole('button', {name: /notifications/i}))
        await userEvent.click(screen.getByRole('button', {name: /mark all read/i}))

        expect(markAllReadMock).toHaveBeenCalled()
    })

    describe('language-aware content', () => {
        it('shows the Arabic title/body when the active language is Arabic', async () => {
            await i18n.changeLanguage('ar')
            mockLists({notifications: [buildNotification()]})
            render(<NotificationBell/>)

            await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

            expect(screen.getByText('عنوان')).toBeInTheDocument()
            expect(screen.getByText('نص')).toBeInTheDocument()
            expect(screen.queryByText('Job démarré')).not.toBeInTheDocument()
        })

        it('shows the English title/body when the active language is English', async () => {
            await i18n.changeLanguage('en')
            mockLists({notifications: [buildNotification()]})
            render(<NotificationBell/>)

            await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

            expect(screen.getByText('Job started')).toBeInTheDocument()
            expect(screen.getByText('Your job has started.')).toBeInTheDocument()
        })

        it('falls back to French for an unrecognized language', async () => {
            await i18n.changeLanguage('es')
            mockLists({notifications: [buildNotification()]})
            render(<NotificationBell/>)

            await userEvent.click(screen.getByRole('button', {name: /notifications/i}))

            expect(screen.getByText('Job démarré')).toBeInTheDocument()
        })
    })
})
