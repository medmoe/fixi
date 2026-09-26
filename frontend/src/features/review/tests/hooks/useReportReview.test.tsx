import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient} from "@tanstack/react-query";
import {reviewApi} from "@/lib/api/reviewApi";
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";
import {useReportReview} from "../../hooks/useReportReview";
import {toast} from "sonner";

vi.mock("@/lib/api/reviewApi", () => ({
    reviewApi: {
        reportReview: vi.fn(),
    },
}));
vi.mock("sonner", () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe("useReportReview", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    it("calls reviewApi.reportReview with the review id", async () => {
        vi.mocked(reviewApi.reportReview).mockResolvedValue(undefined);
        const {result} = renderHook(() => useReportReview(), {wrapper: createWrapper(queryClient)});

        result.current.mutate(1);

        await waitFor(() => expect(reviewApi.reportReview).toHaveBeenCalledWith(1));
    });

    it("shows a success toast on success", async () => {
        vi.mocked(reviewApi.reportReview).mockResolvedValue(undefined);
        const {result} = renderHook(() => useReportReview(), {wrapper: createWrapper(queryClient)});

        result.current.mutate(1);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(toast.success).toHaveBeenCalled();
    });

    it("shows a specific toast for a duplicate report", async () => {
        vi.mocked(reviewApi.reportReview).mockRejectedValue({
            response: {status: 400, data: {detail: "You have already reported this review"}},
        });
        const {result} = renderHook(() => useReportReview(), {wrapper: createWrapper(queryClient)});

        result.current.mutate(1);

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith("You have already reported this review");
    });

    it("shows a generic error toast on other failures", async () => {
        vi.mocked(reviewApi.reportReview).mockRejectedValue(new Error("network error"));
        const {result} = renderHook(() => useReportReview(), {wrapper: createWrapper(queryClient)});

        result.current.mutate(1);

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith("Failed to report review");
    });
});
