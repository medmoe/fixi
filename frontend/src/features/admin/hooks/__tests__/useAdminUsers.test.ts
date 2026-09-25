import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {PaginatedListResponse} from '@/features/types'
import type {UserRead} from '@/features/user'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useAdminUsers} from '../useAdminUsers'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        listUsers: vi.fn(),
    },
}))

const mockUser = (id: number): UserRead => ({
    id,
    name: `User ${id}`,
    username: `user_${id}`,
    email: `user${id}@example.com`,
    uuid: `uuid-${id}`,
    profile_image_url: 'https://example.com/image.jpg',
    role_type: 'worker',
    is_deleted: false,
    is_superuser: false,
    is_suspended: false,
    tier_id: 1,
    location: null,
    display_location: null,
    preferred_language: 'fr',
    deleted_at: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: null,
})

const makePage = (ids: number[], total_count: number, has_more: boolean): PaginatedListResponse<UserRead> => ({
    data: ids.map(mockUser),
    total_count,
    has_more,
    items_per_page: 20,
    page: null,
})

describe('useAdminUsers', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({shouldAdvanceTime: true})
        queryClient = createQueryClient()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('fetches users on initial mount', async () => {
        vi.mocked(adminApi.listUsers).mockResolvedValue(makePage([1, 2], 2, false))

        const {result} = renderHook(() => useAdminUsers(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.users).toHaveLength(2)
        expect(result.current.totalCount).toBe(2)
    })

    it('does not trigger a new query immediately on filter change', async () => {
        vi.mocked(adminApi.listUsers).mockResolvedValue(makePage([1], 1, false))

        const {result} = renderHook(() => useAdminUsers(), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        const callsBefore = vi.mocked(adminApi.listUsers).mock.calls.length

        act(() => {
            result.current.updateFilters({search: 'john'})
        })

        expect(vi.mocked(adminApi.listUsers).mock.calls.length).toBe(callsBefore)
    })

    it('triggers a new query after the 300ms debounce window', async () => {
        vi.mocked(adminApi.listUsers).mockResolvedValue(makePage([1], 1, false))

        const {result} = renderHook(() => useAdminUsers(), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        const callsBefore = vi.mocked(adminApi.listUsers).mock.calls.length

        act(() => {
            result.current.updateFilters({search: 'john'})
        })
        act(() => {
            vi.advanceTimersByTime(300)
        })

        await waitFor(() => {
            expect(vi.mocked(adminApi.listUsers).mock.calls.length).toBeGreaterThan(callsBefore)
        })
    })

    it('appends new users to the existing list on loadMore', async () => {
        vi.mocked(adminApi.listUsers)
            .mockResolvedValueOnce(makePage([1, 2], 4, true))
            .mockResolvedValueOnce(makePage([3, 4], 4, false))

        const {result} = renderHook(() => useAdminUsers(), {wrapper: createWrapper(queryClient)})
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.users).toHaveLength(2)

        await act(async () => {
            await result.current.loadMore()
        })

        await waitFor(() => expect(result.current.users).toHaveLength(4))
        expect(result.current.hasMore).toBe(false)
    })

    it('exposes isError when the query fails', async () => {
        vi.mocked(adminApi.listUsers).mockRejectedValue(new Error('Network error'))

        const {result} = renderHook(() => useAdminUsers(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.users).toEqual([])
    })
})
