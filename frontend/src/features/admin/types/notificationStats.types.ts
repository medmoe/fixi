export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms'

/** GET /notifications/stats -- one row per (channel, provider). */
export interface NotificationFailureRateRead {
    channel: NotificationChannel
    provider: string
    sent: number
    failed: number
    /** Suppressed by a user's preferences -- never attempted, so not in failure_rate. */
    skipped: number
    attempted: number
    /** failed / attempted in [0, 1]; null when nothing was attempted. */
    failure_rate: number | null
}
