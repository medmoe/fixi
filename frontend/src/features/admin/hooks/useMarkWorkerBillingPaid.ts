import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {WORKER_BILLING_KEY} from './useWorkerBillingDashboard'

export const useMarkWorkerBillingPaid = () => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (workerBillingId: number) => adminApi.markWorkerBillingPaid(workerBillingId),
        onSuccess: () => {
            toast.success(t('toasts.billingMarkedPaid'))
            queryClient.invalidateQueries({queryKey: WORKER_BILLING_KEY})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.markPaidFailed'))
        },
    })
}
