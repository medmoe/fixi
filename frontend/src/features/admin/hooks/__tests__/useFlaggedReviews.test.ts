import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {FlaggedReviewRead} from '@/features/admin'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useFlaggedReviews} from '../useFlaggedReviews'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        listFlaggedReviews: vi.fn(),
    },
}))

const mockReviews: FlaggedReviewRead[] = [
    {id: 1, rating: 1, comment: 'Terrible', reviewer_name: 'Ali', reviewee_name: 'Bob', report_count: 2, created_at: '2026-09-01T10:00:00Z'},
]

describe('useFlaggedReviews', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('fetches the flagged reviews', async () => {
        vi.mocked(adminApi.listFlaggedReviews).mockResolvedValue(mockReviews)

        const {result} = renderHook(() => useFlaggedReviews(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.data).toEqual(mockReviews)
    })

    it('exposes isError when the query fails', async () => {
        vi.mocked(adminApi.listFlaggedReviews).mockRejectedValue(new Error('failed'))

        const {result} = renderHook(() => useFlaggedReviews(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isError).toBe(true))
    })
})
