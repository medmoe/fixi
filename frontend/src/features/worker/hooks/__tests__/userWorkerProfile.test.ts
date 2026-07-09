import {vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {workerApi} from '@/lib/api/workerApi'
import {createQueryClient, createWrapper, mockProfile, WORKER_ID} from "./helpers";
import {useWorkerProfile} from '../useWorkerProfile.ts'


// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        getWorkerProfile: vi.fn()
    }
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useWorkerProfile', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('does fetch and return worker profile successfully', async () => {
        vi.mocked(workerApi.getWorkerProfile).mockResolvedValue(mockProfile);
        const {result} = renderHook(
            () => useWorkerProfile(WORKER_ID),
            {wrapper: createWrapper(queryClient)}
        )
        // assertions
        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockProfile)
        expect(workerApi.getWorkerProfile).toHaveBeenCalledWith(WORKER_ID)
        expect(workerApi.getWorkerProfile).toHaveBeenCalledTimes(1)
    })
    it('should remain idle and disabled when worker id is falsy', () => {
        const {result} = renderHook(
            () => useWorkerProfile(0),
            {wrapper: createWrapper(queryClient)}
        )
        expect(result.current.status).toBe('idle');
        expect(result.current.isLoading).toBe(false)
        expect(result.current.fetchStatus).toBe('idle')
        expect(workerApi.getWorkerProfile).not.toHaveBeenCalled()
    })
    it('should handle API errors gracefully', async () => {
        const mockError = new Error('Database connection failed.')
        vi.mocked(workerApi.getWorkerProfile).mockRejectedValueOnce(mockError)
        const {result} = renderHook(
            () => useWorkerProfile(WORKER_ID),
            {wrapper: createWrapper(queryClient)}
        )
        await waitFor(() => expect(result.current.isError).toBe(true))

        expect(result.current.error).toEqual(mockError)
        expect(result.current.data).toBeUndefined()
    })
})