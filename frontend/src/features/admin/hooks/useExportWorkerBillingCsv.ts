import {useMutation} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {downloadBlob} from '@/lib/downloadBlob'
import type {WorkerBillingAdminFilters} from '../types/workerBilling.types'

export const useExportWorkerBillingCsv = () => {
    const {t} = useTranslation('admin')

    return useMutation({
        mutationFn: (filters: WorkerBillingAdminFilters) => adminApi.exportWorkerBillingCsv(filters),
        onSuccess: (blob) => downloadBlob(blob, 'worker-billing.csv'),
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.exportFailed'))
        },
    })
}
