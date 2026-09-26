import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'

export const FLAGGED_REVIEWS_KEY = ['admin', 'flagged-reviews'] as const

export const useFlaggedReviews = () => {
    return useQuery({
        queryKey: FLAGGED_REVIEWS_KEY,
        queryFn: () => adminApi.listFlaggedReviews(),
    })
}
