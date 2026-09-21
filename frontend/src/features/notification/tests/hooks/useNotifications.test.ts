import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useNotifications, NOTIFICATIONS_QUERY_KEY} from '../../hooks/useNotifications'
import {notificationApi} from '@/lib/api/notificationApi'
import {getAccessToken} from '@/lib/api/apiClient'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        getNotifications: vi.fn(),
    },
}))

vi.mock('@/lib/api/apiClient', async () => {
    const actual = await vi.importActual<typeof import('@/lib/api/apiClient')>('@/lib/api/apiClient')
    return {...actual, getAccessToken: vi.fn(() => 'a-token')}
})

const mockResponse = {data: [], total_count: 0, has_more: false, page: 1, items_per_page: 20}

describe('useNotifications', () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.getNotifications).mockResolvedValue(mockResponse)
        queryClient = createQueryClient()
    })

    it('calls the API with the given paging and filter options', async () => {
        const {result} = renderHook(() => useNotifications({page: 2, itemsPerPage: 5, unreadOnly: true}), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(notificationApi.getNotifications).toHaveBeenCalledWith(2, 5, true)
    })

    it('defaults to page 1, 20 per page, all notifications', async () => {
        const {result} = renderHook(() => useNotifications(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(notificationApi.getNotifications).toHaveBeenCalledWith(1, 20, false)
    })

    it('uses a query key scoped under NOTIFICATIONS_QUERY_KEY so invalidation catches every variant', async () => {
        renderHook(() => useNotifications({unreadOnly: true}), {wrapper: createWrapper(queryClient)})

        await waitFor(() => {
            const matches = queryClient.getQueryCache().findAll({queryKey: NOTIFICATIONS_QUERY_KEY})
            expect(matches.length).toBeGreaterThan(0)
        })
    })

    it('does not fetch when there is no access token', () => {
        vi.mocked(getAccessToken).mockReturnValueOnce(null)

        renderHook(() => useNotifications(), {wrapper: createWrapper(queryClient)})

        expect(notificationApi.getNotifications).not.toHaveBeenCalled()
    })
})
