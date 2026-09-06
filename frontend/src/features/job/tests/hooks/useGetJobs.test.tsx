import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {useGetJobs} from "../../hooks/useGetJobs";
import {jobApi} from "@/lib";
import {JobStatus} from "../../types";

vi.mock("@/lib", () => ({jobApi: {getJobs: vi.fn()}}));

const mockJob = (id: number) => ({
    id,
    title: `Job ${id}`,
    status: 'open' as JobStatus,
    description: null,
    trade_category_id: 1,
    user_id: 1,
    budget_min: null,
    budget_max: null,
    display_location: null,
    created_at: "2026-01-01T00:00:00",
    updated_at: null,
    uuid: "uuid",
    is_deleted: false,
    trade_category: null,
    user: null,
    coordinates: null,
    deleted_at: null,
});

const makePage = (ids: number[], total_count: number, has_more: boolean) => ({
    data: ids.map(mockJob),
    total_count,
    has_more,
    items_per_page: 20,
    page: 1,
});

const createWrapper = (initialEntries = ["/"]) => {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </QueryClientProvider>
    );
};

describe("useGetJobs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("reads initial filters from the URL", () => {
        const {result} = renderHook(() => useGetJobs(), {
            wrapper: createWrapper(["/?status=open&trade_category_id=2"]),
        });
        expect(result.current.filters.status).toBe("open");
        expect(result.current.filters.trade_category_id).toBe(2);
    });

    it("fetches jobs on initial mount", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([1, 2], 2, false));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.jobs).toHaveLength(2);
        expect(result.current.totalCount).toBe(2);
    });

    it("does not refetch immediately on filter change — waits for debounce", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        const callsBefore = vi.mocked(jobApi.getJobs).mock.calls.length;
        act(() => result.current.updateFilters({status: "open"}));

        expect(vi.mocked(jobApi.getJobs).mock.calls.length).toBe(callsBefore);
    });

    it("refetches after the 300ms debounce window with the new filters", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([1], 1, false));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.updateFilters({status: "open"}));
        act(() => vi.advanceTimersByTime(300));

        await waitFor(() => {
            const lastCall = vi.mocked(jobApi.getJobs).mock.calls.at(-1);
            expect(lastCall?.[0]).toMatchObject({status: "open"});
        });
    });

    it("regression: queryKey changes when filters change, triggering a real refetch", async () => {
        vi.mocked(jobApi.getJobs)
            .mockResolvedValueOnce(makePage([1], 1, false))
            .mockResolvedValueOnce(makePage([2], 1, false));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.jobs[0].id).toBe(1);

        act(() => result.current.updateFilters({status: "open"}));
        act(() => vi.advanceTimersByTime(300));

        await waitFor(() => expect(result.current.jobs[0]?.id).toBe(2));
    });

    it("appends new jobs on loadMore", async () => {
        vi.mocked(jobApi.getJobs)
            .mockResolvedValueOnce(makePage([1, 2], 4, true))
            .mockResolvedValueOnce(makePage([3, 4], 4, false));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.jobs).toHaveLength(2);

        await act(async () => {
            await result.current.loadMore();
        });

        await waitFor(() => expect(result.current.jobs).toHaveLength(4));
        expect(result.current.hasMore).toBe(false);
    });

    it("exposes isError on failure", async () => {
        vi.mocked(jobApi.getJobs).mockRejectedValue(new Error("Network error"));

        const {result} = renderHook(() => useGetJobs(), {wrapper: createWrapper()});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(result.current.jobs).toEqual([]);
    });
});