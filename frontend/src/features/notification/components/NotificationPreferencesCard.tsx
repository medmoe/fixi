import React from 'react'
import {Bell, Loader2} from 'lucide-react'
import {useTranslation} from 'react-i18next'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Switch} from '@/components/ui/switch'
import {useNotificationPreferences} from '../hooks/useNotificationPreferences'
import {useUpdateNotificationPreference} from '../hooks/useUpdateNotificationPreference'
import type {NotificationPreferenceChannel} from '../types'

// Maps the event_type strings the backend's TOGGLEABLE_EVENT_CHANNELS
// catalog returns (src/app/services/notifications/event_catalog.py) to a
// translation key under `notification:events.*` -- keep these two lists in
// sync. event_type values contain dots ("job_application.accepted"), which
// i18next would otherwise parse as a nested-key path, hence the indirection
// through a dot-free key rather than using event_type as the key directly.
// An event_type missing here still renders (falls back to the raw string)
// rather than being dropped, so a new backend event type never silently
// disappears from the settings UI.
const EVENT_TYPE_KEYS: Record<string, string> = {
    'job_application.accepted': 'events.jobApplicationAccepted',
    'job_application.rejected': 'events.jobApplicationRejected',
    'job_application.confirmed': 'events.jobApplicationConfirmed',
    'job_application.withdrawn': 'events.jobApplicationWithdrawn',
    'job.started': 'events.jobStarted',
    'job.completed': 'events.jobCompleted',
    'job.completion_pending_confirmation': 'events.jobCompletionPendingConfirmation',
    review_received: 'events.reviewReceived',
    worker_verification_approved: 'events.workerVerificationApproved',
}

export const NotificationPreferencesCard: React.FC = () => {
    const {t} = useTranslation('notification')
    const {data: preferences, isLoading} = useNotificationPreferences()
    const {mutate: updatePreference, isPending, variables} = useUpdateNotificationPreference()

    const isRowPending = (eventType: string, channel: NotificationPreferenceChannel) =>
        isPending && variables?.eventType === eventType && variables?.channel === channel

    const findPreference = (eventType: string, channel: NotificationPreferenceChannel) =>
        preferences?.find((preference) => preference.event_type === eventType && preference.channel === channel)

    const eventTypes = Array.from(new Set((preferences ?? []).map((preference) => preference.event_type)))

    const labelFor = (eventType: string): string => {
        const key = EVENT_TYPE_KEYS[eventType]
        return key ? t(key) : eventType
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5"/>
                    {t('preferences.title')}
                </CardTitle>
                <CardDescription>
                    {t('preferences.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        {t('preferences.loading')}
                    </div>
                ) : (
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-4 text-sm">
                        <div/>
                        <div className="text-center font-medium text-muted-foreground">{t('preferences.push')}</div>
                        <div className="text-center font-medium text-muted-foreground">{t('preferences.email')}</div>
                        {eventTypes.map((eventType) => {
                            const push = findPreference(eventType, 'push')
                            const email = findPreference(eventType, 'email')
                            const label = labelFor(eventType)

                            return (
                                <React.Fragment key={eventType}>
                                    <div>{label}</div>
                                    <div className="flex justify-center">
                                        {push && (
                                            <Switch
                                                checked={push.enabled}
                                                disabled={isRowPending(eventType, 'push')}
                                                onCheckedChange={(checked) => updatePreference({eventType, channel: 'push', enabled: checked})}
                                                aria-label={t('preferences.pushAriaLabel', {label})}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {email && (
                                            <Switch
                                                checked={email.enabled}
                                                disabled={isRowPending(eventType, 'email')}
                                                onCheckedChange={(checked) => updatePreference({eventType, channel: 'email', enabled: checked})}
                                                aria-label={t('preferences.emailAriaLabel', {label})}
                                            />
                                        )}
                                    </div>
                                </React.Fragment>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
