import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {toast} from 'sonner'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient} from '@/features/worker/tests/helpers.tsx'
import {usePermanentlyDeleteUser} from '../usePermanentlyDeleteUser'

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({useNavigate: () => navigate}))
vi.mock('@/lib/api/adminApi', () => ({adminApi: {permanentlyDeleteUser: vi.fn()}}))
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}))

describe('usePermanentlyDeleteUser', () => {
    let queryClient: QueryClient
    const wrapper = ({children}: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('deletes, returns to the user list and drops only that user\'s cached queries', async () => {
        vi.mocked(adminApi.permanentlyDeleteUser).mockResolvedValue(undefined)
        queryClient.setQueryData(['admin', 'users', 5], {id: 5})
        queryClient.setQueryData(['admin', 'users', 5, 'audit-log'], [])
        queryClient.setQueryData(['admin', 'users', 6], {id: 6})
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => usePermanentlyDeleteUser(5), {wrapper})

        result.current.mutate('GDPR #1')

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(adminApi.permanentlyDeleteUser).toHaveBeenCalledWith(5, 'GDPR #1')
        expect(navigate).toHaveBeenCalledWith('/admin/users', {replace: true})
        expect(toast.success).toHaveBeenCalled()
        expect(queryClient.getQueryData(['admin', 'users', 5])).toBeUndefined()
        expect(queryClient.getQueryData(['admin', 'users', 5, 'audit-log'])).toBeUndefined()
        expect(queryClient.getQueryData(['admin', 'users', 6])).toEqual({id: 6})

        const {predicate} = invalidate.mock.calls[0][0] as any
        expect(predicate({queryKey: ['admin', 'users', {search: 'x'}]})).toBe(true)
        expect(predicate({queryKey: ['admin', 'users', 5]})).toBe(false)
    })

    it('stays on the page and shows an error toast on failure', async () => {
        vi.mocked(adminApi.permanentlyDeleteUser).mockRejectedValue({response: {data: {detail: 'Cannot delete another admin account'}}})
        const {result} = renderHook(() => usePermanentlyDeleteUser(5), {wrapper})

        result.current.mutate(undefined)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(navigate).not.toHaveBeenCalled()
        expect(toast.error).toHaveBeenCalled()
    })
})
