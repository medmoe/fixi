import type {NotificationRead} from '../types'

/**
 * Notifications are stored trilingually (title_ar/fr/en, body_ar/fr/en --
 * see src/app/models/notification.py) since there's no i18next-style
 * fallback chain on the backend; this picks the pair matching the app's
 * active UI language, defaulting to French for anything else (matches
 * i18next's own fallbackLng, see src/lib/i18n.ts) rather than assuming a
 * two-language world.
 */
export const getLocalizedNotificationText = (
    notification: NotificationRead,
    language: string
): { title: string; body: string } => {
    switch (language) {
        case 'ar':
            return {title: notification.title_ar, body: notification.body_ar}
        case 'en':
            return {title: notification.title_en, body: notification.body_en}
        default:
            return {title: notification.title_fr, body: notification.body_fr}
    }
}
