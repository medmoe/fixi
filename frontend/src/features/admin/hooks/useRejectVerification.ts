import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {WORKER_VERIFICATION_QUEUE_KEY} from './useWorkerVerificationQueue'

interface RejectVerificationPayload {
    workerProfileId: number
    reason: string
}

export const useRejectVerification = () => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({workerProfileId, reason}: RejectVerificationPayload) => adminApi.rejectWorkerVerification(workerProfileId, reason),
        onSuccess: () => {
            toast.success(t('toasts.verificationRejected'))
            queryClient.invalidateQueries({queryKey: WORKER_VERIFICATION_QUEUE_KEY})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.rejectFailed'))
        },
    })
}
