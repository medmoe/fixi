import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {FLAGGED_REVIEWS_KEY} from './useFlaggedReviews'

/** Hides the review; the backend recalculates the worker's avg_rating. */
export const useRemoveFlaggedReview = () => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (reviewId: number) => adminApi.removeFlaggedReview(reviewId),
        onSuccess: () => {
            toast.success(t('toasts.reviewRemoved'))
            queryClient.invalidateQueries({queryKey: FLAGGED_REVIEWS_KEY})
            // The worker's public reviews list and rating are now stale.
            queryClient.invalidateQueries({queryKey: ['worker-reviews']})
            queryClient.invalidateQueries({queryKey: ['worker-profile']})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.removeReviewFailed'))
        },
    })
}
