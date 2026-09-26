import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {WORKER_VERIFICATION_QUEUE_KEY} from './useWorkerVerificationQueue'

export const useApproveVerification = () => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (workerProfileId: number) => adminApi.approveWorkerVerification(workerProfileId),
        onSuccess: () => {
            toast.success(t('toasts.verificationApproved'))
            queryClient.invalidateQueries({queryKey: WORKER_VERIFICATION_QUEUE_KEY})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.approveFailed'))
        },
    })
}
