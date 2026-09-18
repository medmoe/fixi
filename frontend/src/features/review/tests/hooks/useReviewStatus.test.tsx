import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useReviewStatus} from "@/features/review";
import {reviewApi} from "@/lib";

vi.mock("@/lib", () => ({reviewApi: {getReviewStatus: vi.fn()}}));

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("useReviewStatus", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    });

    it("calls reviewApi.getReviewStatus with the job id", async () => {
        vi.mocked(reviewApi.getReviewStatus).mockResolvedValue({can_review: true, reason: null});

        const {result} = renderHook(() => useReviewStatus(42), {wrapper: createWrapper(queryClient)});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(reviewApi.getReviewStatus).toHaveBeenCalledWith(42);
        expect(result.current.data).toEqual({can_review: true, reason: null});
    });

    it("does not fetch when jobId is null", () => {
        renderHook(() => useReviewStatus(null), {wrapper: createWrapper(queryClient)});
        expect(reviewApi.getReviewStatus).not.toHaveBeenCalled();
    });
});
