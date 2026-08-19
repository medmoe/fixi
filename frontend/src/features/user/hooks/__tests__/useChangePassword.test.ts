import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {userApi} from '@/lib/api/userApi'
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";
import {useChangePassword} from '@/features/user'
import {toast} from 'sonner'

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

// ─── Shared helpers ────────────────────────────────────────────────────────────────────

const mockPasswordPayload = {
    current_password: 'oldPass123!',
    new_password: 'NewPass1!',
    confirm_password: 'NewPass1!',
}

describe('useChangePassword', () => {
    let queryClient: QueryClient
    const username = 'john_doe'

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Mutation execution ────────────────────────────────────────────────────────────────────

    describe('mutation execution', () => {
        it('calls userApi.changePassword with username and payload', async () => {
            vi.mocked(userApi.changePassword).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(userApi.changePassword).toHaveBeenCalledWith(username, mockPasswordPayload))
        })
        it('calls userApi.changePassword exactly once per mutate', async () => {
            vi.mocked(userApi.changePassword).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(userApi.changePassword).toHaveBeenCalledTimes(1))
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when mutating', () => {
            vi.mocked(userApi.changePassword).mockImplementation(() => new Promise(() => {
            })) // never resolves
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            waitFor(() => expect(result.current.isPending).toBe(true))
        })
        it('is not loading after successful mutation', async () => {
            vi.mocked(userApi.changePassword).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isSuccess).toBe(true)
        })
        it('is not loading after failed mutation', async () => {
            vi.mocked(userApi.changePassword).mockRejectedValue(new Error('API error'))
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isError).toBe(true)
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns undefined on success', async () => {
            vi.mocked(userApi.changePassword).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('shows success toast on success', async () => {
            vi.mocked(userApi.changePassword).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Password changed successfully')
        })
    })

    // ─── Error state ────────────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(userApi.changePassword).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('exposes the error object', async () => {
            const error = new Error('Wrong current password')
            vi.mocked(userApi.changePassword).mockRejectedValue(error)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
        it('shows error toast with default message', async () => {
            vi.mocked(userApi.changePassword).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Failed to change password')
        })
        it('shows error toast with server message when available', async () => {
            const error = new Error('API call failed') as any
            error.response = {data: {detail: 'Current password is incorrect'}}
            vi.mocked(userApi.changePassword).mockRejectedValue(error)
            const {result} = renderHook(
                () => useChangePassword(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate(mockPasswordPayload)
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Current password is incorrect')
        })
    })
})

