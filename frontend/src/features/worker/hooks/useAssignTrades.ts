
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { workerApi } from '@/lib/api/workerApi'
import { toast } from 'sonner'
import type { WorkerTradeNestedRead } from '@/features/worker/types/tradeCategory.types'

export const useAssignTrades = () => {
    const queryClient = useQueryClient()

    const assignTrades = useMutation<WorkerTradeNestedRead[], Error, number[]>({
        mutationFn: (trade_category_ids: number[]) =>
            workerApi.assignTrades(trade_category_ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerProfile'] })
            toast.success('Trades updated successfully')
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.detail ??
                'Failed to update trade categories'
            toast.error(message)
        },
    })

    const removeTrade = useMutation<WorkerTradeNestedRead[], Error, number>({
        mutationFn: (trade_category_id: number) =>
            workerApi.removeTrade(trade_category_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workerProfile'] })
            toast.success('Trade removed successfully')
        },
        onError: () => {
            toast.error('Failed to remove trade category')
        },
    })

    return { assignTrades, removeTrade }
}