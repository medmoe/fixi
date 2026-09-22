import {useCallback} from 'react'
import i18n, {type SupportedLanguage} from '@/lib/i18n'
import {useUpdateUser, useUser} from '@/features/user'

/**
 * Switches the active language for the whole app immediately (no reload --
 * react-i18next re-renders every `useTranslation()` consumer on change),
 * and persists the choice to `users.preferred_language` when logged in so
 * it survives across sessions/devices. Logged-out visitors just get the
 * local switch -- there's no user record to persist it to.
 */
export const useChangeLanguage = () => {
    const {data: user} = useUser()
    const {mutate: updateUser} = useUpdateUser(user?.username ?? '')

    return useCallback(
        (language: SupportedLanguage) => {
            void i18n.changeLanguage(language)
            if (user && user.preferred_language !== language) {
                updateUser({preferred_language: language})
            }
        },
        [user, updateUser]
    )
}
