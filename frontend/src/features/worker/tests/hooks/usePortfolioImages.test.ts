import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {toast} from 'sonner'
import {workerApi} from '@/lib/api/workerApi'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'
import {useDeletePortfolioImage, usePortfolioImages, useUploadPortfolioImage} from '../../hooks/usePortfolioImages'

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {getPortfolioImages: vi.fn(), uploadPortfolioImage: vi.fn(), deletePortfolioImage: vi.fn()},
}))
vi.mock('sonner', () => ({toast: {success: vi.fn(), error: vi.fn()}}))

const image = {id: 1, worker_profile_id: 3, image_url: 'https://cdn/x.jpg', created_at: '2026-09-01T00:00:00Z', updated_at: null}

describe('portfolio hooks', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
    })

    it('usePortfolioImages fetches a worker\'s images', async () => {
        vi.mocked(workerApi.getPortfolioImages).mockResolvedValue([image])
        const {result} = renderHook(() => usePortfolioImages(3), {wrapper: createWrapper(queryClient)})

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(workerApi.getPortfolioImages).toHaveBeenCalledWith(3)
        expect(result.current.data).toEqual([image])
    })

    it('usePortfolioImages waits for a profile id', () => {
        renderHook(() => usePortfolioImages(undefined), {wrapper: createWrapper(queryClient)})
        expect(workerApi.getPortfolioImages).not.toHaveBeenCalled()
    })

    it('useUploadPortfolioImage uploads and refreshes the gallery', async () => {
        vi.mocked(workerApi.uploadPortfolioImage).mockResolvedValue(image)
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
        const file = new File(['x'], 'a.jpg', {type: 'image/jpeg'})
        const {result} = renderHook(() => useUploadPortfolioImage(3), {wrapper: createWrapper(queryClient)})

        result.current.mutate(file)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(workerApi.uploadPortfolioImage).toHaveBeenCalledWith(file)
        expect(invalidate).toHaveBeenCalledWith({queryKey: ['portfolio-images', 3]})
        expect(toast.success).toHaveBeenCalled()
    })

    it('useUploadPortfolioImage maps the limit error to a friendly message', async () => {
        vi.mocked(workerApi.uploadPortfolioImage).mockRejectedValue({response: {data: {detail: 'Maximum number of portfolio images reached'}}})
        const {result} = renderHook(() => useUploadPortfolioImage(3), {wrapper: createWrapper(queryClient)})

        result.current.mutate(new File(['x'], 'a.jpg'))

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(toast.error).toHaveBeenCalledWith("You've reached the maximum number of portfolio photos.")
    })

    it('useDeletePortfolioImage deletes and refreshes the gallery', async () => {
        vi.mocked(workerApi.deletePortfolioImage).mockResolvedValue(undefined)
        const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
        const {result} = renderHook(() => useDeletePortfolioImage(3), {wrapper: createWrapper(queryClient)})

        result.current.mutate(1)

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(workerApi.deletePortfolioImage).toHaveBeenCalledWith(1)
        expect(invalidate).toHaveBeenCalledWith({queryKey: ['portfolio-images', 3]})
    })
})
