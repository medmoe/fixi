import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {workerApi} from '@/lib/api/workerApi.ts';
import {QueryClient} from '@tanstack/react-query'
import {createQueryClient, createWrapper} from '../helpers.tsx';
import {useTrades} from '../../hooks/useTrades.ts';
import {TradeCategoryWithChildren} from "@/features/worker";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api/workerApi', () => ({
    workerApi: {
        getTrades: vi.fn(),
    }
}))

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn(),
        success: vi.fn(),
    }
}))

const mockTrades: TradeCategoryWithChildren[] = [
    {id: 1, name: 'plumbing', display_name: 'Plumbing', icon_name: 'wrench', parent_id: null, created_at: '2026-01-01', children: []},
    {id: 2, name: 'electrical', display_name: 'Electrical', icon_name: 'bolt', parent_id: null, created_at: '2026-01-01', children: []},
]

describe('useTrades', () => {
    let queryClient: QueryClient

    beforeEach(() => {
        queryClient = createQueryClient()
        vi.clearAllMocks()
    })

    // ─── Query behavior ────────────────────────────────────────────────────────

    describe('query behavior', () => {
        it('calls getTrades on mount', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(workerApi.getTrades).toHaveBeenCalledTimes(1)
        })

        it('returns trades data on success', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual(mockTrades)
        })

        it('returns correct number of trades', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toHaveLength(2)
        })

        it('returns empty array when no trades exist', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue([])

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.data).toEqual([])
        })

        it('uses correct query key', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))

            // verify data is cached under the correct key
            const cached = queryClient.getQueryData(['trades'])
            expect(cached).toEqual(mockTrades)
        })

        it('uses 1-hour stale time — does not refetch if data is fresh', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result: result1} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result1.current.isSuccess).toBe(true))

            // mount a second instance of the hook
            const {result: result2} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result2.current.isSuccess).toBe(true))

            // getTrades should only be called once — second hook uses cache
            expect(workerApi.getTrades).toHaveBeenCalledTimes(1)
        })
    })

    // ─── Loading state ─────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially', () => {
            vi.mocked(workerApi.getTrades).mockImplementation(() => new Promise(() => {
            }))

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            expect(result.current.isLoading).toBe(true)
            expect(result.current.data).toBeUndefined()
        })

        it('is not loading after successful fetch', async () => {
            vi.mocked(workerApi.getTrades).mockResolvedValue(mockTrades)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isSuccess).toBe(true))
            expect(result.current.isLoading).toBe(false)
        })
    })

    // ─── Error state ───────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when API call fails', async () => {
            vi.mocked(workerApi.getTrades).mockRejectedValue(new Error('Network error'))

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.data).toBeUndefined()
        })

        it('exposes the error object', async () => {
            const error = new Error('Network error')
            vi.mocked(workerApi.getTrades).mockRejectedValue(error)

            const {result} = renderHook(
                () => useTrades(),
                {wrapper: createWrapper(queryClient)},
            )

            await waitFor(() => expect(result.current.isError).toBe(true))
            expect(result.current.error).toBeTruthy()
        })
    })
})