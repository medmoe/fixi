import React from 'react'
import {Bell, Loader2} from 'lucide-react'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Switch} from '@/components/ui/switch'
import {useNotificationPreferences} from '../hooks/useNotificationPreferences'
import {useUpdateNotificationPreference} from '../hooks/useUpdateNotificationPreference'
import type {NotificationPreferenceChannel} from '../types'

// Human-readable labels for the event_type strings the backend's
// TOGGLEABLE_EVENT_CHANNELS catalog returns (src/app/services/notifications/
// event_catalog.py) -- keep these two lists in sync. An event_type missing
// here still renders (falls back to the raw string) rather than being
// dropped, so a new backend event type never silently disappears from the
// settings UI.
const EVENT_TYPE_LABELS: Record<string, string> = {
    'job_application.accepted': 'Your job application was accepted',
    'job_application.rejected': 'Your job application was declined',
    'job_application.confirmed': 'A worker confirmed your job',
    'job_application.withdrawn': 'A worker withdrew from your job',
    'job.started': 'A job you booked started',
    'job.completed': 'A job was marked completed',
    'job.completion_pending_confirmation': 'A job is awaiting your confirmation',
    review_received: 'You received a new review',
    worker_verification_approved: 'Your worker verification was approved',
}

export const NotificationPreferencesCard: React.FC = () => {
    const {data: preferences, isLoading} = useNotificationPreferences()
    const {mutate: updatePreference, isPending, variables} = useUpdateNotificationPreference()

    const isRowPending = (eventType: string, channel: NotificationPreferenceChannel) =>
        isPending && variables?.eventType === eventType && variables?.channel === channel

    const findPreference = (eventType: string, channel: NotificationPreferenceChannel) =>
        preferences?.find((preference) => preference.event_type === eventType && preference.channel === channel)

    const eventTypes = Array.from(new Set((preferences ?? []).map((preference) => preference.event_type)))

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5"/>
                    Notification Preferences
                </CardTitle>
                <CardDescription>
                    Choose which events send you a push notification or an email.
                    SMS verification codes cannot be turned off.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin"/>
                        Loading preferences...
                    </div>
                ) : (
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-4 text-sm">
                        <div/>
                        <div className="text-center font-medium text-muted-foreground">Push</div>
                        <div className="text-center font-medium text-muted-foreground">Email</div>
                        {eventTypes.map((eventType) => {
                            const push = findPreference(eventType, 'push')
                            const email = findPreference(eventType, 'email')
                            const label = EVENT_TYPE_LABELS[eventType] ?? eventType

                            return (
                                <React.Fragment key={eventType}>
                                    <div>{label}</div>
                                    <div className="flex justify-center">
                                        {push && (
                                            <Switch
                                                checked={push.enabled}
                                                disabled={isRowPending(eventType, 'push')}
                                                onCheckedChange={(checked) => updatePreference({eventType, channel: 'push', enabled: checked})}
                                                aria-label={`Push notifications: ${label}`}
                                            />
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {email && (
                                            <Switch
                                                checked={email.enabled}
                                                disabled={isRowPending(eventType, 'email')}
                                                onCheckedChange={(checked) => updatePreference({eventType, channel: 'email', enabled: checked})}
                                                aria-label={`Email notifications: ${label}`}
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
