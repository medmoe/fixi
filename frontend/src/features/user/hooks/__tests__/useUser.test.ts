import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {userApi} from '@/lib/api/userApi'
import {createQueryClient, createWrapper} from "@/features/worker/hooks/__tests__/helpers";
import {USER_QUERY_KEY, UserRead, useUser} from '@/features/user'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/userApi', () => ({
    userApi: {
        me: vi.fn(),
        updateUser: vi.fn(),
        changePassword: vi.fn(),
        deleteUser: vi.fn(),
    }
}))

const mockUser: UserRead = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    location: 'New York, NY',
    profile_image_url: 'https://example.com/image.jpg',
    uuid: '12345678-1234-1234-1234-123456789012',
    role_type: 'worker',
    is_deleted: false,
    is_superuser: false,
    tier_id: 1,
    created_at: '2023-01-01T00:00:00Z',
    deleted_at: null,
    updated_at: null,
}

describe('useUser', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Query execution ────────────────────────────────────────────────────────────────────

    describe('query execution', () => {
        it('calls userApi.me', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(userApi.me).toHaveBeenCalledWith())
        })
        it('calls userApi.me exactly once on mount', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(userApi.me).toHaveBeenCalledTimes(1))
        })
        it('uses correct query key', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(queryClient.getQueryData(USER_QUERY_KEY)).toEqual(mockUser))
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when fetching', () => {
            vi.mocked(userApi.me).mockImplementation(() => new Promise(() => {
            })) // never resolves
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            expect(result.current.isLoading).toBe(true)
            expect(result.current.data).toBeUndefined()
        })
        it('is not loading after successful fetch', async () => {

            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            expect(result.current.isSuccess).toBe(true)
        })
        it('is not loading after failed fetch', async () => {
            queryClient.setDefaultOptions({
                queries: {
                    retryDelay: 0
                }
            })
            vi.mocked(userApi.me).mockRejectedValue(new Error('API error'))
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isLoading).toBe(false))
            expect(result.current.isError).toBe(true)
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns user data on success', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockUser)
        })
        it('returns correct user fields', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toMatchObject({
                name: 'John Doe',
                username: 'john_doe',
                email: 'john@example.com',
            })
        })
        it('caches result — does not refetch when hook remounts', async () => {
            vi.mocked(userApi.me).mockResolvedValue(mockUser)
            const {unmount} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )

            await waitFor(() => expect(queryClient.getQueryData(USER_QUERY_KEY)).toEqual(mockUser))
            unmount()
            // remount — should use cache
            renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            // still only called once
            await waitFor(() => expect(userApi.me).toHaveBeenCalledTimes(1))
        })
    })

    // ─── Error state ────────────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            queryClient.setDefaultOptions({
                queries: {
                    retryDelay: 0
                }
            })
            vi.mocked(userApi.me).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(
                () => expect(result.current.isError).toBe(true),
            )
            expect(result.current.data).toBeUndefined()
        })
        it('exposes the error object', async () => {
            queryClient.setDefaultOptions({
                queries: {
                    retryDelay: 0
                }
            })
            const error = new Error('Not authenticated')
            vi.mocked(userApi.me).mockRejectedValue(error)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
        it('does not retry on 401', async () => {
            const error = new Error('Unauthorized') as any
            error.response = {status: 401}
            vi.mocked(userApi.me).mockRejectedValue(error)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(userApi.me).toHaveBeenCalledTimes(1)
        })
        it('retries up to 3 times on non-401 errors', async () => {
            queryClient.setDefaultOptions({
                queries: {
                    retryDelay: 0
                }
            })
            const error = new Error('Network error') as any
            error.response = {status: 500}
            vi.mocked(userApi.me).mockRejectedValue(error)
            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(userApi.me).toHaveBeenCalledTimes(4)
        })
    })

    // ─── Refetch behavior ────────────────────────────────────────────────────────────────────

    describe('refetch behavior', () => {
        it('refetches and updates data on manual refetch', async () => {
            const updatedUser = {...mockUser, name: 'Updated Name'}
            vi.mocked(userApi.me)
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(updatedUser)

            const {result} = renderHook(
                () => useUser(),
                {wrapper: createWrapper(queryClient)}
            )
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.name).toEqual(mockUser.name)
            await result.current.refetch()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data?.name).toEqual(updatedUser.name)
        })
    })
})