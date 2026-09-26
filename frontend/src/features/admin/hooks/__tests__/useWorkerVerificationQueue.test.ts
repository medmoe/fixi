import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {WorkerVerificationQueueRead} from '@/features/admin'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useWorkerVerificationQueue} from '../useWorkerVerificationQueue'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        listWorkerVerifications: vi.fn(),
    },
}))

const mockQueue: WorkerVerificationQueueRead[] = [
    {id: 1, user_id: 1, name: 'Ali', email: 'ali@example.com', bio: 'Plumber', years_of_experience: 5},
]

describe('useWorkerVerificationQueue', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('fetches the queue', async () => {
        vi.mocked(adminApi.listWorkerVerifications).mockResolvedValue(mockQueue)

        const {result} = renderHook(() => useWorkerVerificationQueue(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.data).toEqual(mockQueue)
    })

    it('exposes isError when the query fails', async () => {
        vi.mocked(adminApi.listWorkerVerifications).mockRejectedValue(new Error('failed'))

        const {result} = renderHook(() => useWorkerVerificationQueue(), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isError).toBe(true))
    })
})
