import type {TFunction} from 'i18next'

// Backend `detail` strings this app knows how to translate, keyed by the
// exact English text the API sends (see e.g. src/app/api/v1/auth.py's
// UnauthorizedException/DuplicateValueException calls). The backend itself
// has no i18n awareness and doesn't know the caller's language -- these
// are the messages users hit often enough to be worth mapping client-side
// rather than leaving in English. Anything not listed here falls through
// unchanged.
const KNOWN_ERROR_KEYS: Record<string, string> = {
    'Wrong username, email or password.': 'toasts.invalidCredentials',
    'Email already registered': 'toasts.emailAlreadyRegistered',
    'Username already registered': 'toasts.usernameAlreadyRegistered',
}

/** Translates a raw backend `detail` string via the known-error map above,
 * falling back to the original string unchanged when it isn't recognized. */
export const translateApiErrorDetail = (detail: string, t: TFunction): string => {
    const key = KNOWN_ERROR_KEYS[detail]
    return key ? t(key) : detail
}

/** Formats an Axios-style error's `response.data.detail` into a single
 * user-facing string: a known single-string detail gets translated,
 * a Pydantic validation array gets its messages joined (still raw --
 * those come from the backend's field validation, not this map), and
 * anything else falls back to a generic translated message. */
export const formatApiError = (error: any, t: TFunction): string => {
    const detail = error?.response?.data?.detail

    if (Array.isArray(detail)) {
        if (detail.length === 0) {
            return t('toasts.genericError')
        }
        return detail
            .map((err: any) => err.msg)
            .filter(Boolean)
            .join('. ')
    }

    if (typeof detail === 'string' && detail.length > 0) {
        return translateApiErrorDetail(detail, t)
    }

    return t('toasts.genericError')
}
