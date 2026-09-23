import {useTranslation} from 'react-i18next'

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const WEEK = DAY * 7
const MONTH = DAY * 30
const YEAR = DAY * 365

/**
 * "3 weeks ago" style relative timestamp, localized and pluralized via
 * i18next (src/locales/{ar,fr,en}/common.json -- `relativeTime.*`, using
 * count-based keys so Arabic's 6 plural forms render correctly, not just
 * English/French's 2). A hook rather than a plain function so the
 * component calling it re-renders -- and re-formats -- when the active
 * language changes, instead of being stuck in whatever language was active
 * on first render.
 */
export const useFormatRelativeDate = () => {
    const {t} = useTranslation()

    return (isoDate: string): string => {
        const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)

        if (seconds < MINUTE) return t('common:relativeTime.justNow')
        if (seconds < HOUR) return t('common:relativeTime.minutesAgo', {count: Math.floor(seconds / MINUTE)})
        if (seconds < DAY) return t('common:relativeTime.hoursAgo', {count: Math.floor(seconds / HOUR)})
        if (seconds < WEEK) return t('common:relativeTime.daysAgo', {count: Math.floor(seconds / DAY)})
        if (seconds < MONTH) return t('common:relativeTime.weeksAgo', {count: Math.floor(seconds / WEEK)})
        if (seconds < YEAR) return t('common:relativeTime.monthsAgo', {count: Math.floor(seconds / MONTH)})
        return t('common:relativeTime.yearsAgo', {count: Math.floor(seconds / YEAR)})
    }
}
