import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useWorkerReviews} from "@/features/review";
import {reviewApi} from "@/lib";

vi.mock("@/lib", () => ({reviewApi: {getWorkerReviews: vi.fn()}}));

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

const makeReview = (id: number) => ({
    id,
    rating: 5,
    comment: null,
    reviewer_display_name: "Kristin G.",
    created_at: "2026-01-01T00:00:00Z",
});

const makeMeta = () => ({average_rating: "4.50", review_count: 3, total_pages: 1, rating_breakdown: {5: 2, 4: 0, 3: 1, 2: 0, 1: 0}});

describe("useWorkerReviews", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    });

    it("fetches the first page with the default 'recent' sort", async () => {
        vi.mocked(reviewApi.getWorkerReviews).mockResolvedValue({data: [makeReview(1)], next_cursor: null, meta: makeMeta()});

        const {result} = renderHook(() => useWorkerReviews(7), {wrapper: createWrapper(queryClient)});

        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(reviewApi.getWorkerReviews).toHaveBeenCalledWith(7, {cursor: undefined, sort: "recent"});
        expect(result.current.reviews).toHaveLength(1);
        expect(result.current.meta).toEqual(makeMeta());
    });

    it("exposes hasMore based on next_cursor and loads the next page on demand", async () => {
        vi.mocked(reviewApi.getWorkerReviews)
            .mockResolvedValueOnce({data: [makeReview(1)], next_cursor: "abc", meta: makeMeta()})
            .mockResolvedValueOnce({data: [makeReview(2)], next_cursor: null, meta: makeMeta()});

        const {result} = renderHook(() => useWorkerReviews(7), {wrapper: createWrapper(queryClient)});
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.hasMore).toBe(true);

        result.current.loadMore();

        await waitFor(() => expect(result.current.reviews).toHaveLength(2));
        expect(reviewApi.getWorkerReviews).toHaveBeenLastCalledWith(7, {cursor: "abc", sort: "recent"});
        expect(result.current.hasMore).toBe(false);
    });
});
