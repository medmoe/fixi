import {beforeEach, describe, expect, it, vi} from 'vitest'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {NotificationPreferencesCard} from '../../components/NotificationPreferencesCard'
import {useNotificationPreferences} from '../../hooks/useNotificationPreferences'
import {useUpdateNotificationPreference} from '../../hooks/useUpdateNotificationPreference'
import type {NotificationPreference} from '../../types'

vi.mock('../../hooks/useNotificationPreferences')
vi.mock('../../hooks/useUpdateNotificationPreference')

const mockPreferences: NotificationPreference[] = [
    {event_type: 'job.started', channel: 'push', enabled: true},
    {event_type: 'review_received', channel: 'push', enabled: true},
    {event_type: 'review_received', channel: 'email', enabled: false},
]

const updateMock = vi.fn()

describe('NotificationPreferencesCard', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useUpdateNotificationPreference).mockReturnValue({mutate: updateMock, isPending: false, variables: undefined} as never)
    })

    it('shows a loading state while preferences are being fetched', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: undefined, isLoading: true} as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('renders a row per event type with a switch per available channel', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: mockPreferences, isLoading: false} as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.getByText('A job you booked started')).toBeInTheDocument()
        expect(screen.getByText('You received a new review')).toBeInTheDocument()
        // job.started only offers push -- no email switch for that row
        expect(screen.getByLabelText('Push notifications: A job you booked started')).toBeInTheDocument()
        expect(screen.queryByLabelText('Email notifications: A job you booked started')).not.toBeInTheDocument()
        // review_received offers both
        expect(screen.getByLabelText('Push notifications: You received a new review')).toBeInTheDocument()
        expect(screen.getByLabelText('Email notifications: You received a new review')).toBeInTheDocument()
    })

    it('reflects each switch state from the fetched data', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: mockPreferences, isLoading: false} as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.getByLabelText('Push notifications: You received a new review')).toHaveAttribute('data-state', 'checked')
        expect(screen.getByLabelText('Email notifications: You received a new review')).toHaveAttribute('data-state', 'unchecked')
    })

    it('falls back to the raw event_type string for an unmapped event type', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({
            data: [{event_type: 'some.new.event', channel: 'push', enabled: true}], isLoading: false,
        } as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.getByText('some.new.event')).toBeInTheDocument()
    })

    it('toggling a switch calls the mutation with the event type, channel, and new value', async () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: mockPreferences, isLoading: false} as never)
        const user = userEvent.setup()

        render(<NotificationPreferencesCard/>)
        await user.click(screen.getByLabelText('Push notifications: A job you booked started'))

        expect(updateMock).toHaveBeenCalledWith({eventType: 'job.started', channel: 'push', enabled: false})
    })

    it('disables only the switch currently being updated', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: mockPreferences, isLoading: false} as never)
        vi.mocked(useUpdateNotificationPreference).mockReturnValue({
            mutate: updateMock, isPending: true, variables: {eventType: 'job.started', channel: 'push', enabled: false},
        } as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.getByLabelText('Push notifications: A job you booked started')).toBeDisabled()
        expect(screen.getByLabelText('Push notifications: You received a new review')).not.toBeDisabled()
    })

    it('never renders a switch for SMS or in-app -- the API never returns those channels', () => {
        vi.mocked(useNotificationPreferences).mockReturnValue({data: mockPreferences, isLoading: false} as never)

        render(<NotificationPreferencesCard/>)

        expect(screen.queryByLabelText(/sms/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/in.app/i)).not.toBeInTheDocument()
    })
})
