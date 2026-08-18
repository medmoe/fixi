import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {userApi} from '@/lib/api/userApi'
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";
import {useDeactivateAccount} from '@/features/user'
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


describe('useDeactivateAccount', () => {
    let queryClient: QueryClient
    const username = 'john_doe'

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    // ─── Mutation execution ────────────────────────────────────────────────────────────────────

    describe('mutation execution', () => {
        it('calls userApi.deleteUser with username', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(userApi.deleteUser).toHaveBeenCalledWith(username))
        })
        it('calls userApi.deleteUser exactly once per mutate', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(userApi.deleteUser).toHaveBeenCalledTimes(1))
        })
    })

    // ─── Loading state ────────────────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when mutating', () => {
            vi.mocked(userApi.deleteUser).mockImplementation(() => new Promise(() => {
            })) // never resolves
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            waitFor(() => expect(result.current.isPending).toBe(true))
        })
        it('is not loading after successful mutation', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isSuccess).toBe(true)
        })
        it('is not loading after failed mutation', async () => {
            vi.mocked(userApi.deleteUser).mockRejectedValue(new Error('API error'))
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isPending).toBe(false))
            expect(result.current.isError).toBe(true)
        })
    })

    // ─── Success state ────────────────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns undefined on success', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('shows success toast on success', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalledWith('Account deactivated')
        })
        it('clears query cache on success', async () => {
            vi.mocked(userApi.deleteUser).mockResolvedValue(undefined)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(queryClient.isMutating()).toBe(0)
        })
    })

    // ─── Error state ────────────────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(userApi.deleteUser).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.data).toBeUndefined()
        })
        it('exposes the error object', async () => {
            const error = new Error('Cannot deactivate')
            vi.mocked(userApi.deleteUser).mockRejectedValue(error)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
        it('shows error toast with default message', async () => {
            vi.mocked(userApi.deleteUser).mockRejectedValue(new Error('API call failed'))
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Failed to deactivate account')
        })
        it('shows error toast with server message when available', async () => {
            const error = new Error('API call failed') as any
            error.response = {data: {detail: 'Account has pending jobs'}}
            vi.mocked(userApi.deleteUser).mockRejectedValue(error)
            const {result} = renderHook(
                () => useDeactivateAccount(username),
                {wrapper: createWrapper(queryClient)}
            )
            result.current.mutate()
            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalledWith('Account has pending jobs')
        })
    })
})