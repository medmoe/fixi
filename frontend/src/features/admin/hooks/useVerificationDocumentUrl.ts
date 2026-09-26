import {useMutation} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'

/** Fetched on demand (not auto-loaded per queue row) -- opens the signed
 * URL in a new tab once resolved, rather than eagerly generating one for
 * every pending profile whether or not an admin looks at it. */
export const useVerificationDocumentUrl = () => {
    const {t} = useTranslation('admin')

    return useMutation({
        mutationFn: (workerProfileId: number) => adminApi.getVerificationDocumentUrl(workerProfileId),
        onSuccess: (url) => {
            window.open(url, '_blank', 'noopener,noreferrer')
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.documentUrlFailed'))
        },
    })
}
