import {useTranslation} from 'react-i18next'
import type {SupportedLanguage} from '@/lib/i18n'

// BCP-47 locale tags Intl expects, keyed by this app's internal language
// codes. `numberingSystem: 'latn'` is forced everywhere rather than left to
// implicit locale defaults -- Algeria (and the Maghreb generally) uses
// Western/Latin digits in everyday digital contexts even in Arabic text,
// unlike Gulf Arabic locales that default to Arabic-Indic digits. Being
// explicit here means the choice is documented and doesn't silently drift
// if a browser's ICU data ever changes.
const INTL_LOCALES: Record<SupportedLanguage, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    ar: 'ar-DZ',
}

// USD for now -- Issue 4 ("Locale-aware number, date, and currency
// formatting") deliberately scoped this to formatting infrastructure only.
// Whether displayed amounts should actually be DZD is a product/business
// decision (and depends on what the stored hourly_rate/budget_* values are
// meant to represent), not something to guess at here. Swapping currency
// later is a one-line change once that's decided.
const CURRENCY = 'USD'

// `i18n.language` isn't guaranteed to be a bare 'en'/'fr'/'ar' -- the
// browser-language-detector fallback path reports whatever the environment
// gives it (e.g. jsdom's navigator.language is 'en-US' in tests), so the
// base subtag has to be extracted before it's looked up here.
const resolveLocale = (language: string): string =>
    INTL_LOCALES[language.split('-')[0] as SupportedLanguage] ?? INTL_LOCALES.fr

/** Formats a number as currency in the active UI language. */
export const useFormatCurrency = () => {
    const {i18n} = useTranslation()
    const locale = resolveLocale(i18n.language)

    return (amount: number): string =>
        new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: CURRENCY,
            numberingSystem: 'latn',
        }).format(amount)
}

/** Formats a Date (or ISO string) in the active UI language. Pass `options`
 * to control precision (defaults to a plain date, no time-of-day). */
export const useFormatDate = () => {
    const {i18n} = useTranslation()
    const locale = resolveLocale(i18n.language)

    return (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
        const value = typeof date === 'string' ? new Date(date) : date
        return new Intl.DateTimeFormat(locale, {numberingSystem: 'latn', ...options}).format(value)
    }
}

/** Formats a plain number (ratings, distances, counts) in the active UI
 * language. Pass `options` for things like a fixed decimal count. */
export const useFormatNumber = () => {
    const {i18n} = useTranslation()
    const locale = resolveLocale(i18n.language)

    return (value: number, options?: Intl.NumberFormatOptions): string =>
        new Intl.NumberFormat(locale, {numberingSystem: 'latn', ...options}).format(value)
}
