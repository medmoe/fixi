import {beforeEach, describe, expect, it, vi} from 'vitest'
import {act, renderHook, waitFor} from '@testing-library/react'
import {QueryClient} from "@tanstack/react-query"
import {useAssignTrades} from '@/features/worker'
import {workerApi} from '@/lib/api/workerApi.ts'
import {toast} from 'sonner'
import {createQueryClient, createWrapper} from '../helpers.tsx'
import {mockTrades} from '../mocks.ts'

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        assignTrades: vi.fn(),
        removeTrade: vi.fn(),
    },
}))

vi.mock('sonner', () => ({
    toast: {success: vi.fn(), error: vi.fn()},
}))


describe('useAssignTrades', () => {
    let queryClient: QueryClient
    let wrapper: ReturnType<typeof createWrapper>

    beforeEach(() => {
        queryClient = createQueryClient()
        wrapper = createWrapper(queryClient)
        vi.clearAllMocks()
    })

    describe('assignTrades mutation', () => {
        it('calls workerApi.assignTrades with correct trade_category_ids', async () => {
            vi.mocked(workerApi.assignTrades).mockResolvedValue(mockTrades)
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.assignTrades.mutateAsync([10, 20])
            })

            expect(workerApi.assignTrades).toHaveBeenCalledWith([10, 20])
        })

        it('returns updated trades list on success', async () => {
            vi.mocked(workerApi.assignTrades).mockResolvedValue(mockTrades)
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.assignTrades.mutateAsync([10])
            })

            await waitFor(() => expect(result.current.assignTrades.isSuccess).toBe(true))
            expect(result.current.assignTrades.data).toEqual(mockTrades)
        })

        it('shows success toast on assign', async () => {
            vi.mocked(workerApi.assignTrades).mockResolvedValue(mockTrades)
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.assignTrades.mutateAsync([10])
            })

            expect(toast.success).toHaveBeenCalledWith('Trades updated successfully')
        })

        it('shows error toast on 400 — limit exceeded', async () => {
            vi.mocked(workerApi.assignTrades).mockRejectedValue({
                response: {status: 400, data: {detail: 'Assigning trades would exceed limit of 5'}},
            })
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                result.current.assignTrades.mutate([10])
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Assigning trades would exceed limit of 5')
            )
        })

        it('shows fallback error message on unknown error', async () => {
            vi.mocked(workerApi.assignTrades).mockRejectedValue(new Error('Network error'))
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                result.current.assignTrades.mutate([10])
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Failed to update trade categories')
            )
        })

        it('is idle initially', () => {
            const {result} = renderHook(() => useAssignTrades(), {wrapper})
            expect(result.current.assignTrades.isPending).toBe(false)
        })
    })

    describe('removeTrade mutation', () => {
        it('calls workerApi.removeTrade with correct trade_category_id', async () => {
            vi.mocked(workerApi.removeTrade).mockResolvedValue(mockTrades)
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.removeTrade.mutateAsync(10)
            })

            expect(workerApi.removeTrade).toHaveBeenCalledWith(10)
        })

        it('returns updated trades list after removal', async () => {
            vi.mocked(workerApi.removeTrade).mockResolvedValue([])
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.removeTrade.mutateAsync(10)
            })

            await waitFor(() => expect(result.current.removeTrade.isSuccess).toBe(true))
            expect(result.current.removeTrade.data).toEqual([])
        })

        it('shows success toast on remove', async () => {
            vi.mocked(workerApi.removeTrade).mockResolvedValue([])
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                await result.current.removeTrade.mutateAsync(10)
            })

            expect(toast.success).toHaveBeenCalledWith('Trade removed successfully')
        })

        it('shows error toast on remove failure', async () => {
            vi.mocked(workerApi.removeTrade).mockRejectedValue(new Error('Failed'))
            const {result} = renderHook(() => useAssignTrades(), {wrapper})

            await act(async () => {
                result.current.removeTrade.mutate(10)
            })

            await waitFor(() =>
                expect(toast.error).toHaveBeenCalledWith('Failed to remove trade category')
            )
        })

        it('is idle initially', () => {
            const {result} = renderHook(() => useAssignTrades(), {wrapper})
            expect(result.current.removeTrade.isPending).toBe(false)
        })
    })
})