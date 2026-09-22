import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import common_ar from '@/locales/ar/common.json'
import common_fr from '@/locales/fr/common.json'
import common_en from '@/locales/en/common.json'

// `ar`/`fr` are the languages Phase 7 targets (see
// documentation/PHASE_7_I18N_RTL_ISSUES.md); `en` was added after, as a
// request beyond that issue's original scope. `fr` is first/default to
// match the backend's PreferredLanguage default (src/app/models/user.py)
// for logged-out visitors with no detectable preference.
export const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Namespaces are per-feature (see PHASE_7_I18N_RTL_ISSUES.md Issue 1's
// "namespaced by feature" task) -- only `common` exists so far since string
// extraction across the app is Issue 2's job, not this one. Add a namespace
// here (and a matching src/locales/{ar,fr}/<name>.json pair) as each
// feature's strings get extracted.
export const NAMESPACES = ['common'] as const

// A missing key must never reach a real user as a raw i18next key (Issue 1
// acceptance criteria) -- but hiding it in dev would make missing
// translations invisible to whoever's adding them. So: return the key (and
// warn) only in dev, return an empty string otherwise. Exported standalone
// so both branches are unit-testable without faking import.meta.env.
export const createParseMissingKeyHandler = (isDev: boolean) => (key: string): string => (isDev ? key : '')

export const createMissingKeyHandler =
    (isDev: boolean) =>
    (_languages: readonly string[], _namespace: string, key: string): void => {
        if (isDev) {
            // eslint-disable-next-line no-console
            console.warn(`[i18n] Missing translation key: ${key}`)
        }
    }

const isDev = import.meta.env.DEV

void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            fr: {common: common_fr},
            ar: {common: common_ar},
            en: {common: common_en},
        },
        ns: NAMESPACES,
        defaultNS: 'common',
        supportedLngs: SUPPORTED_LANGUAGES,
        nonExplicitSupportedLngs: true,
        // French is the fallback for every other language deliberately --
        // a key missing in `ar`/`en` (translation still in progress, Issue
        // 2) shows the French text instead of nothing, which is strictly
        // better UX than a blank string even though it's momentarily the
        // "wrong" language.
        fallbackLng: 'fr',
        detection: {
            // No `htmlTag` here on purpose -- setting `dir` on <html> is
            // RTL layout switching, which is Issue 3's job, not this one.
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
        interpolation: {escapeValue: false},
        saveMissing: isDev,
        missingKeyHandler: createMissingKeyHandler(isDev),
        parseMissingKeyHandler: createParseMissingKeyHandler(isDev),
        returnEmptyString: false,
    })

// Single place that reacts to every language change, regardless of what
// triggered it (detector's initial guess, useLanguageSync on login,
// useChangeLanguage from the switcher) -- keeps <html lang> accurate for
// accessibility/SEO. Deliberately does NOT touch `dir` -- RTL layout
// switching is Issue 3's job, not this one.
i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language
})

export default i18n
