import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, renderHook, waitFor} from "@testing-library/react";
import {QueryClient} from "@tanstack/react-query";
import {useWorkerSearch, WorkerProfileWithTradesRead} from "@/features/worker";
import {workerApi} from "@/lib";
import type {PaginatedListResponse} from "@/features/types.ts";
import {createQueryClient, createWrapper} from "../helpers.tsx"

vi.mock("@/lib", () => ({
    workerApi: {
        searchWorkers: vi.fn()
    }
}))

const mockWorker = (id: number): WorkerProfileWithTradesRead => ({
    id,
    user_id: id,
    user: {id, name: `Worker ${id}`, location: null, display_location: null},
    bio: null,
    hourly_rate: 75.00,
    years_of_experience: 5,
    service_radius_km: 20,
    is_available: true,
    is_verified: false,
    trade_categories: [],
    avatar_url: null,
    available_since: null
});

const makePage = (
    ids: number[],
    total_count: number,
    has_more: boolean
): PaginatedListResponse<WorkerProfileWithTradesRead> => ({
    data: ids.map(mockWorker),
    total_count,
    has_more,
    items_per_page: 20,
    page: 1
});

describe("useWorkerSearch", () => {
    let queryClient: QueryClient
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({shouldAdvanceTime: true});
        queryClient = createQueryClient();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ------------------------------------------------------------------ //
    //  Initial load / URL sync                                             //
    // ------------------------------------------------------------------ //

    it("reads initial filters from the URL", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(
                queryClient,
                ['/workers/search?is_verified=true&trade_category_id=2']
                )
        });

        expect(result.current.filters.is_verified).toBe(true);
        expect(result.current.filters.trade_category_id).toBe(2);
    });

    it("fetches workers on initial mount", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1, 2], 2, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.workers).toHaveLength(2);
        expect(result.current.totalCount).toBe(2);
    });

    // ------------------------------------------------------------------ //
    //  Debouncing                                                          //
    // ------------------------------------------------------------------ //

    it("does not trigger a new query immediately on filter change", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const callsBefore = vi.mocked(workerApi.searchWorkers).mock.calls.length;

        act(() => {
            result.current.updateFilters({is_verified: true});
        });

        // no new call yet — debounce window hasn't elapsed
        expect(vi.mocked(workerApi.searchWorkers).mock.calls.length).toBe(callsBefore);
    });

    it("triggers a new query after the 300ms debounce window", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const callsBefore = vi.mocked(workerApi.searchWorkers).mock.calls.length;

        act(() => {
            result.current.updateFilters({is_verified: true});
        });

        act(() => {
            vi.advanceTimersByTime(300);
        });

        await waitFor(() => {
            expect(vi.mocked(workerApi.searchWorkers).mock.calls.length).toBeGreaterThan(callsBefore);
        });
    });

    it("does not fire a query for every keystroke within the debounce window", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        const callsBefore = vi.mocked(workerApi.searchWorkers).mock.calls.length;

        // rapid-fire updates, each resetting the debounce timer
        act(() => {
            result.current.updateFilters({min_hourly_rate: 10});
        });
        act(() => {
            vi.advanceTimersByTime(100);
            result.current.updateFilters({min_hourly_rate: 20});
        });
        act(() => {
            vi.advanceTimersByTime(100);
            result.current.updateFilters({min_hourly_rate: 30});
        });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        await waitFor(() => {
            // only ONE additional call should have fired, not three
            expect(vi.mocked(workerApi.searchWorkers).mock.calls.length).toBe(callsBefore + 1);
        });
    });

    // ------------------------------------------------------------------ //
    //  Pagination                                                          //
    // ------------------------------------------------------------------ //

    it("exposes hasMore based on the API response", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([1], 5, true));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.hasMore).toBe(true);
    });

    it("appends new workers to the existing list on loadMore", async () => {
        vi.mocked(workerApi.searchWorkers)
            .mockResolvedValueOnce(makePage([1, 2], 4, true))
            .mockResolvedValueOnce(makePage([3, 4], 4, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.workers).toHaveLength(2);

        await act(async () => {
            await result.current.loadMore();
        });

        await waitFor(() => expect(result.current.workers).toHaveLength(4));
        expect(result.current.hasMore).toBe(false);
    });

    // ------------------------------------------------------------------ //
    //  Error handling                                                      //
    // ------------------------------------------------------------------ //

    it("exposes isError when the query fails", async () => {
        vi.mocked(workerApi.searchWorkers).mockRejectedValue(new Error("Network error"));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.workers).toEqual([]);
    });

    // ------------------------------------------------------------------ //
    //  Empty results                                                       //
    // ------------------------------------------------------------------ //

    it("returns an empty array when no workers match", async () => {
        vi.mocked(workerApi.searchWorkers).mockResolvedValue(makePage([], 0, false));

        const {result} = renderHook(() => useWorkerSearch(), {
            wrapper: createWrapper(queryClient, ["/workers/search"]),
        });

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.workers).toEqual([]);
        expect(result.current.totalCount).toBe(0);
    });
});