import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useVerificationDocumentUrl} from '../useVerificationDocumentUrl'
import {toast} from 'sonner'

vi.mock('@/lib/api/adminApi', () => ({
    adminApi: {
        getVerificationDocumentUrl: vi.fn(),
    },
}))
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

describe('useVerificationDocumentUrl', () => {
    let queryClient: QueryClient
    let windowOpenSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
        windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    })

    it('calls adminApi.getVerificationDocumentUrl with the worker profile id', async () => {
        vi.mocked(adminApi.getVerificationDocumentUrl).mockResolvedValue('https://signed.example.com/cni.pdf')
        const {result} = renderHook(() => useVerificationDocumentUrl(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(adminApi.getVerificationDocumentUrl).toHaveBeenCalledWith(1))
    })

    it('opens the resolved url in a new tab', async () => {
        vi.mocked(adminApi.getVerificationDocumentUrl).mockResolvedValue('https://signed.example.com/cni.pdf')
        const {result} = renderHook(() => useVerificationDocumentUrl(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(windowOpenSpy).toHaveBeenCalledWith('https://signed.example.com/cni.pdf', '_blank', 'noopener,noreferrer')
    })

    it('shows an error toast on failure', async () => {
        vi.mocked(adminApi.getVerificationDocumentUrl).mockRejectedValue(new Error('failed'))
        const {result} = renderHook(() => useVerificationDocumentUrl(), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalled()
        expect(windowOpenSpy).not.toHaveBeenCalled()
    })
})
