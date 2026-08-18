import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {userApi} from '@/lib/api/userApi'
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";
import {USER_QUERY_KEY, UserRead, useUpdateUser} from '@/features/user'
import {toast} from 'sonner'

vi.mock('@/lib/api/userApi', () => ({
    userApi: {
        me: vi.fn(),
        updateUser: vi.fn(),
        changePassword: vi.fn(),
        deleteUser: vi.fn(),
    }
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
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
    display_location: 'New York, NY'
}

const mockUpdatePayload = {
    name: 'Jane Doe',
    username: 'jane_doe',
    email: 'jane@example.com',
    location: 'Los Angeles, CA',
    profile_image_url: 'https://example.com/jane.jpg',
}


describe('useUpdateUser', () => {
    let queryClient: QueryClient
    const username = 'john_doe'

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Mutation execution ────────────────────────────────────────────────────────────────────

    describe('mutation execution', () => {
        it('calls userApi.updateUser with username and payload', async () => {
            vi.mocked(userApi.updateUser).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(userApi.updateUser).toHaveBeenCalledWith(username, mockUpdatePayload))
        })
        it('calls userApi.updateUser exactly once per mutate', async () => {
            vi.mocked(userApi.updateUser).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(userApi.updateUser).toHaveBeenCalledTimes(1))
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when mutating', () => {
            vi.mocked(userApi.updateUser).mockImplementation(() => new Promise(() => {
            })) // never resolves
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            waitFor(() => expect(result.current.isPending).toBe(true))
        })
        it('is not loading after successful mutation', async () => {
            vi.mocked(userApi.updateUser).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isSuccess).toBe(true)
        })
        it('is not loading after failed mutation', async () => {
            vi.mocked(userApi.updateUser).mockRejectedValue(new Error('API error'))
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isError).toBe(true)
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns updated user data on success', async () => {
            const updatedUser = {...mockUser, ...mockUpdatePayload}
            vi.mocked(userApi.updateUser).mockResolvedValue(updatedUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(updatedUser)
        })
        it('updates query cache with new user data', async () => {
            const updatedUser = {...mockUser, ...mockUpdatePayload}
            vi.mocked(userApi.updateUser).mockResolvedValue(updatedUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(queryClient.getQueryData(USER_QUERY_KEY)).toEqual(updatedUser)
        })
        it('shows success toast on success', async () => {
            vi.mocked(userApi.updateUser).mockResolvedValue(mockUser)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Account updated successfully')
        })
    })

    // ─── Error state ────────────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(userApi.updateUser).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('exposes the error object', async () => {
            const error = new Error('Not found')
            vi.mocked(userApi.updateUser).mockRejectedValue(error)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
        it('shows error toast with default message', async () => {
            vi.mocked(userApi.updateUser).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Failed to update account')
        })
        it('shows error toast with server message when available', async () => {
            const error = new Error('API call failed') as any
            error.response = {data: {detail: 'Username already taken'}}
            vi.mocked(userApi.updateUser).mockRejectedValue(error)
            const {result} = renderHook(
                () => useUpdateUser(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockUpdatePayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Username already taken')
        })
    })
})