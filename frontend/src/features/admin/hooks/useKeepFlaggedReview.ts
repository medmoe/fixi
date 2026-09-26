import {useMutation, useQueryClient} from '@tanstack/react-query'
import {useTranslation} from 'react-i18next'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {formatApiError} from '@/lib/api/formatApiError'
import {FLAGGED_REVIEWS_KEY} from './useFlaggedReviews'

/** Dismisses the reports on a review -- the review stays visible. */
export const useKeepFlaggedReview = () => {
    const {t} = useTranslation('admin')
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (reviewId: number) => adminApi.approveFlaggedReview(reviewId),
        onSuccess: () => {
            toast.success(t('toasts.reviewKept'))
            queryClient.invalidateQueries({queryKey: FLAGGED_REVIEWS_KEY})
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, 'toasts.keepReviewFailed'))
        },
    })
}
