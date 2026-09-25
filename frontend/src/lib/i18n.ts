import i18n from 'i18next'
import {initReactI18next} from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import common_ar from '@/locales/ar/common.json'
import common_fr from '@/locales/fr/common.json'
import common_en from '@/locales/en/common.json'
import notification_ar from '@/locales/ar/notification.json'
import notification_fr from '@/locales/fr/notification.json'
import notification_en from '@/locales/en/notification.json'
import landing_ar from '@/locales/ar/landing.json'
import landing_fr from '@/locales/fr/landing.json'
import landing_en from '@/locales/en/landing.json'
import auth_ar from '@/locales/ar/auth.json'
import auth_fr from '@/locales/fr/auth.json'
import auth_en from '@/locales/en/auth.json'
import account_ar from '@/locales/ar/account.json'
import account_fr from '@/locales/fr/account.json'
import account_en from '@/locales/en/account.json'
import worker_ar from '@/locales/ar/worker.json'
import worker_fr from '@/locales/fr/worker.json'
import worker_en from '@/locales/en/worker.json'
import job_ar from '@/locales/ar/job.json'
import job_fr from '@/locales/fr/job.json'
import job_en from '@/locales/en/job.json'
import review_ar from '@/locales/ar/review.json'
import review_fr from '@/locales/fr/review.json'
import review_en from '@/locales/en/review.json'
import customer_ar from '@/locales/ar/customer.json'
import customer_fr from '@/locales/fr/customer.json'
import customer_en from '@/locales/en/customer.json'
import user_ar from '@/locales/ar/user.json'
import user_fr from '@/locales/fr/user.json'
import user_en from '@/locales/en/user.json'
import admin_ar from '@/locales/ar/admin.json'
import admin_fr from '@/locales/fr/admin.json'
import admin_en from '@/locales/en/admin.json'

// `ar`/`fr` are the languages Phase 7 targets (see
// documentation/PHASE_7_I18N_RTL_ISSUES.md); `en` was added after, as a
// request beyond that issue's original scope. `fr` is first/default to
// match the backend's PreferredLanguage default (src/app/models/user.py)
// for logged-out visitors with no detectable preference.
export const SUPPORTED_LANGUAGES = ['fr', 'ar', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Only `ar` reads right-to-left among the languages this app supports.
// Exported standalone (rather than inlined in the listener below) so the
// dir-resolution logic is unit-testable without needing a live i18n
// instance or a DOM.
const RTL_LANGUAGES: ReadonlySet<string> = new Set(['ar'])
export const getDirection = (language: string): 'rtl' | 'ltr' =>
    RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr'

// Namespaces are per-feature (see PHASE_7_I18N_RTL_ISSUES.md Issue 1's
// "namespaced by feature" task). Add a namespace here (and a matching
// src/locales/{ar,fr,en}/<name>.json triple) as each feature's strings get
// extracted (Issue 2).
export const NAMESPACES = ['common', 'notification', 'landing', 'auth', 'account', 'worker', 'job', 'review', 'customer', 'user', 'admin'] as const

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
            fr: {common: common_fr, notification: notification_fr, landing: landing_fr, auth: auth_fr, account: account_fr, worker: worker_fr, job: job_fr, review: review_fr, customer: customer_fr, user: user_fr, admin: admin_fr},
            ar: {common: common_ar, notification: notification_ar, landing: landing_ar, auth: auth_ar, account: account_ar, worker: worker_ar, job: job_ar, review: review_ar, customer: customer_ar, user: user_ar, admin: admin_ar},
            en: {common: common_en, notification: notification_en, landing: landing_en, auth: auth_en, account: account_en, worker: worker_en, job: job_en, review: review_en, customer: customer_en, user: user_en, admin: admin_en},
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
            // No `htmlTag` here on purpose -- the LanguageDetector plugin's
            // own htmlTag setter only ever writes `lang`, never `dir`. The
            // `languageChanged` listener below is the single place that
            // sets both, for every language change regardless of source.
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
// useChangeLanguage from the switcher) -- keeps <html lang> AND <html dir>
// accurate together, so there's never a frame where one updates without
// the other. `dir` is what actually flips the whole layout: Tailwind's
// logical-property utilities (ms-/me-/ps-/pe-/start-/end-/text-start/
// text-end/rounded-s-/rounded-e-) and `rtl:`/`ltr:` variants both key off
// this attribute on an ancestor.
i18n.on('languageChanged', (language) => {
    document.documentElement.lang = language
    document.documentElement.dir = getDirection(language)
})

export default i18n
