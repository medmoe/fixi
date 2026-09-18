import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useWorkerReviewEligibility} from "@/features/review";
import {reviewApi} from "@/lib";

vi.mock("@/lib", () => ({reviewApi: {getWorkerReviewEligibility: vi.fn()}}));

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("useWorkerReviewEligibility", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    });

    it("fetches eligibility when enabled", async () => {
        vi.mocked(reviewApi.getWorkerReviewEligibility).mockResolvedValue({can_review: true, job_id: 9});

        const {result} = renderHook(() => useWorkerReviewEligibility(7, true), {wrapper: createWrapper(queryClient)});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(reviewApi.getWorkerReviewEligibility).toHaveBeenCalledWith(7);
        expect(result.current.data).toEqual({can_review: true, job_id: 9});
    });

    it("does not fetch when disabled (unauthenticated)", () => {
        renderHook(() => useWorkerReviewEligibility(7, false), {wrapper: createWrapper(queryClient)});
        expect(reviewApi.getWorkerReviewEligibility).not.toHaveBeenCalled();
    });
});
