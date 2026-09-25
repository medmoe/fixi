import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useSuspendUser} from '../useSuspendUser'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        suspendUser: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useSuspendUser', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.suspendUser with the user id and reason', async () => {
        vi.mocked(adminApi.suspendUser).mockResolvedValue({is_suspended: true} as any)
        const {result} = renderHook(() => useSuspendUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate('Policy violation')

        await waitFor(() => expect(adminApi.suspendUser).toHaveBeenCalledWith(1, 'Policy violation'))
    })

    it('shows a success toast on success', async () => {
        vi.mocked(adminApi.suspendUser).mockResolvedValue({is_suspended: true} as any)
        const {result} = renderHook(() => useSuspendUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
    })

    it('invalidates admin users queries on success', async () => {
        vi.mocked(adminApi.suspendUser).mockResolvedValue({is_suspended: true} as any)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useSuspendUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'users']})
    })

    it('shows an error toast with the server message on failure', async () => {
        const error = new Error('failed') as any
        error.response = {data: {detail: 'This account is already suspended'}}
        vi.mocked(adminApi.suspendUser).mockRejectedValue(error)
        const {result} = renderHook(() => useSuspendUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalledWith('This account is already suspended')
    })
})
