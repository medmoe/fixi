import {beforeEach, describe, expect, it, vi} from 'vitest'
import {QueryClient} from '@tanstack/react-query'
import {createQueryClient, createWrapper, mockProfile} from "@/features/worker/tests/helpers.tsx";
import {act, renderHook, waitFor} from '@testing-library/react'
import {useUploadCniDocument, type WorkerProfileWithTradesRead} from "@/features/worker";
import {workerApi} from "@/lib/api/workerApi.ts";
import {toast} from "sonner";

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        uploadCniDocument: vi.fn()
    }
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}))

describe('useUploadCniDocument', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = createQueryClient()
        vi.clearAllMocks()
        queryClient.setQueryData<WorkerProfileWithTradesRead>(['workerProfile'], mockProfile)
    })

    const mockFile = new File(['pdf content'], 'cni.pdf', {type: 'application/pdf'})

    describe('API call', () => {
        it('calls uploadCniDocument with the file', async () => {
            vi.mocked(workerApi.uploadCniDocument).mockResolvedValue({...mockProfile, has_cni_document: true})

            const {result} = renderHook(() => useUploadCniDocument(), {wrapper: createWrapper(queryClient)})

            await act(async () => {
                result.current.mutate(mockFile)
            })

            expect(workerApi.uploadCniDocument).toHaveBeenCalledWith(mockFile)
            expect(workerApi.uploadCniDocument).toHaveBeenCalledTimes(1)
        })
    })

    describe('on success', () => {
        it('shows a success toast', async () => {
            vi.mocked(workerApi.uploadCniDocument).mockResolvedValue({...mockProfile, has_cni_document: true})

            const {result} = renderHook(() => useUploadCniDocument(), {wrapper: createWrapper(queryClient)})

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(toast.success).toHaveBeenCalled()
        })

        it('updates the cached worker profile', async () => {
            vi.mocked(workerApi.uploadCniDocument).mockResolvedValue({...mockProfile, has_cni_document: true})

            const {result} = renderHook(() => useUploadCniDocument(), {wrapper: createWrapper(queryClient)})

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            const cached = queryClient.getQueryData<WorkerProfileWithTradesRead>(['workerProfile'])
            expect(cached?.has_cni_document).toBe(true)
        })
    })

    describe('on error', () => {
        it('shows an error toast', async () => {
            vi.mocked(workerApi.uploadCniDocument).mockRejectedValue(new Error('Upload failed'))

            const {result} = renderHook(() => useUploadCniDocument(), {wrapper: createWrapper(queryClient)})

            await act(async () => {
                result.current.mutate(mockFile)
            })

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(toast.error).toHaveBeenCalled()
        })
    })

    describe('mutation state', () => {
        it('is idle initially', () => {
            const {result} = renderHook(() => useUploadCniDocument(), {wrapper: createWrapper(queryClient)})
            expect(result.current.isPending).toBe(false)
        })
    })
})
