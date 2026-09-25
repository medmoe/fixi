import type {TFunction} from 'i18next'

/** Formats an Axios-style error's `response.data.detail` into a single
 * user-facing string.
 *
 * Many backend error messages embed a raw id/status
 * (`f"Job with id {job_id} not found"`) and can't be mapped to a static
 * translation the way a fixed message like "wrong credentials" can -- those
 * pass through unchanged regardless of `knownErrors`. `knownErrors` only
 * covers the messages that are genuinely static text end to end.
 */
export const formatApiError = (
    error: any,
    t: TFunction,
    knownErrors: Record<string, string> = {},
    fallbackKey = 'toasts.genericError',
): string => {
    const detail = error?.response?.data?.detail

    if (Array.isArray(detail)) {
        if (detail.length === 0) {
            return t(fallbackKey)
        }
        return detail
            .map((err: any) => err.msg)
            .filter(Boolean)
            .join('. ')
    }

    if (typeof detail === 'string' && detail.length > 0) {
        const key = knownErrors[detail]
        return key ? t(key) : detail
    }

    return t(fallbackKey)
}
