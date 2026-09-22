import {useEffect} from 'react'
import i18n from '@/lib/i18n'
import {useUser} from '@/features/user'

/**
 * Makes `preferred_language` on the `users` table the source of truth for a
 * logged-in session -- overrides whatever i18next's browser-locale
 * detector guessed, so a user's language choice follows them to a new
 * device/browser rather than being re-guessed from that browser's locale
 * every time (Phase 7 Issue 1: "persists across sessions and devices").
 * A no-op for logged-out visitors, who keep the browser-detected language.
 */
export const useLanguageSync = () => {
    const {data: user} = useUser()
    const preferredLanguage = user?.preferred_language

    useEffect(() => {
        if (preferredLanguage && preferredLanguage !== i18n.language) {
            void i18n.changeLanguage(preferredLanguage)
        }
    }, [preferredLanguage])
}
