import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useSubmitReview} from "@/features/review";
import {reviewApi} from "@/lib";
import {toast} from "sonner";

vi.mock("@/lib", () => ({reviewApi: {submitReview: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("useSubmitReview", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
    });

    it("calls reviewApi.submitReview with the job id and payload", async () => {
        vi.mocked(reviewApi.submitReview).mockResolvedValue({
            id: 1, rating: 5, comment: null, role: "customer", created_at: "2026-01-01T00:00:00",
        });

        const {result} = renderHook(() => useSubmitReview(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({rating: 5, comment: "Great work"});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(reviewApi.submitReview).toHaveBeenCalledWith(42, {rating: 5, comment: "Great work"});
    });

    it("shows a success toast and invalidates the review-status cache on success", async () => {
        vi.mocked(reviewApi.submitReview).mockResolvedValue({
            id: 1, rating: 5, comment: null, role: "customer", created_at: "2026-01-01T00:00:00",
        });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const {result} = renderHook(() => useSubmitReview(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({rating: 5});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(toast.success).toHaveBeenCalledWith("Review submitted!");
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ["review-status", 42]});
    });

    it("shows an error toast on failure", async () => {
        vi.mocked(reviewApi.submitReview).mockRejectedValue({
            response: {data: {detail: "Job is not eligible for review"}},
        });

        const {result} = renderHook(() => useSubmitReview(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({rating: 5});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith("Job is not eligible for review");
    });
});
