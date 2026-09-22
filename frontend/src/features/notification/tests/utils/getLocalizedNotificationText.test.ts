import {describe, expect, it} from 'vitest'
import {getLocalizedNotificationText} from '../../utils/getLocalizedNotificationText'
import type {NotificationRead} from '../../types'

const notification: NotificationRead = {
    id: 1,
    user_id: 1,
    type: 'job.started',
    title_ar: 'عنوان',
    title_fr: 'Titre',
    title_en: 'Title',
    body_ar: 'نص',
    body_fr: 'Corps',
    body_en: 'Body',
    read_at: null,
    related_job_id: null,
    created_at: '2026-09-21T10:00:00Z',
}

describe('getLocalizedNotificationText', () => {
    it('returns the Arabic pair for "ar"', () => {
        expect(getLocalizedNotificationText(notification, 'ar')).toEqual({title: 'عنوان', body: 'نص'})
    })

    it('returns the French pair for "fr"', () => {
        expect(getLocalizedNotificationText(notification, 'fr')).toEqual({title: 'Titre', body: 'Corps'})
    })

    it('returns the English pair for "en"', () => {
        expect(getLocalizedNotificationText(notification, 'en')).toEqual({title: 'Title', body: 'Body'})
    })

    it('falls back to French for an unrecognized language code', () => {
        expect(getLocalizedNotificationText(notification, 'es')).toEqual({title: 'Titre', body: 'Corps'})
    })
})
