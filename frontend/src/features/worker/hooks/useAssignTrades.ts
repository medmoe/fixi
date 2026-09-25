import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {workerApi} from '@/lib/api/workerApi'
import {toast} from 'sonner'
import {formatApiError} from '@/lib/api/formatApiError'
import type {WorkerTradeNestedRead} from '@/features/worker/types/tradeCategory.types'

export const useAssignTrades = () => {
    const {t} = useTranslation('worker')
    const queryClient = useQueryClient()

    const assignTrades = useMutation<WorkerTradeNestedRead[], Error, number[]>({
        mutationFn: (trade_category_ids: number[]) =>
            workerApi.assignTrades(trade_category_ids),
        onSuccess: (assignedTradeCategories) => {
            queryClient.setQueryData(
                ['workerProfile'],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        trade_categories: assignedTradeCategories,
                    }
                }
            )
            toast.success(t('toasts.tradesUpdated'))
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.tradesUpdateFailed'))
        },
    })

    const removeTrade = useMutation<WorkerTradeNestedRead[], Error, number>({
        mutationFn: (trade_category_id: number) =>
            workerApi.removeTrade(trade_category_id),
        onSuccess: (assignedTradeCategories) => {
            queryClient.setQueryData(
                ['workerProfile'],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        trade_categories: assignedTradeCategories,
                    }
                }
            )
            toast.success(t('toasts.tradeRemoved'))
        },
        onError: () => {
            toast.error(t('toasts.tradeRemoveFailed'))
        },
    })

    return {assignTrades, removeTrade}
}