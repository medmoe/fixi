import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useReactivateUser} from '../useReactivateUser'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        reactivateUser: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useReactivateUser', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('calls adminApi.reactivateUser with the user id and reason', async () => {
        vi.mocked(adminApi.reactivateUser).mockResolvedValue({is_suspended: false} as any)
        const {result} = renderHook(() => useReactivateUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate('Appeal approved')

        await waitFor(() => expect(adminApi.reactivateUser).toHaveBeenCalledWith(1, 'Appeal approved'))
    })

    it('shows a success toast on success', async () => {
        vi.mocked(adminApi.reactivateUser).mockResolvedValue({is_suspended: false} as any)
        const {result} = renderHook(() => useReactivateUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(toast.success).toHaveBeenCalled()
    })

    it('invalidates admin users queries on success', async () => {
        vi.mocked(adminApi.reactivateUser).mockResolvedValue({is_suspended: false} as any)
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useReactivateUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['admin', 'users']})
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.reactivateUser).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useReactivateUser(1), {wrapper: createWrapper(queryClient)})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
    })
})
