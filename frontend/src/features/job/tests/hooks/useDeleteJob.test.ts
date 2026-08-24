import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createElement} from "react";
import {useDeleteJob} from "../../hooks/useDeleteJob.ts";
import {toast} from "sonner";
import {jobApi} from "../../../../lib/api/jobApi.ts";
import {mockJob} from "@/mocks";

vi.mock("../../../../lib/api/jobApi");
vi.mock("sonner");

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) =>
        createElement(
            QueryClientProvider,
            {client: queryClient},
            children
        );
};

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    });

describe("useDeleteJob", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();
    });

    // ------------------------------------------------------------------ //
    //  Mutation function                                                   //
    // ------------------------------------------------------------------ //

    it("calls jobApi.deleteJob with the correct job ID", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(jobApi.deleteJob).toHaveBeenCalledOnce();
        expect(jobApi.deleteJob).toHaveBeenCalledWith(mockJob.id);
    });

    it("exposes isPending as true while the mutation is in flight", async () => {
        vi.mocked(jobApi.deleteJob).mockImplementation(
            () =>
                new Promise((resolve) =>
                    setTimeout(() => resolve(undefined), 100)
                )
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isPending).toBe(true);
        });
    });

    // ------------------------------------------------------------------ //
    //  onSuccess                                                           //
    // ------------------------------------------------------------------ //

    it("shows a success toast after successful deletion", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(toast.success).toHaveBeenCalledWith(
            "Job deleted successfully"
        );
    });

    it("invalidates the jobs query after successful deletion", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const invalidateSpy = vi.spyOn(
            queryClient,
            "invalidateQueries"
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ["jobs"],
        });
    });

    it("removes the deleted job from the individual job cache", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        queryClient.setQueryData(
            ["job", mockJob.id],
            mockJob
        );

        expect(
            queryClient.getQueryData(["job", mockJob.id])
        ).toEqual(mockJob);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(
            queryClient.getQueryData(["job", mockJob.id])
        ).toBeUndefined();
    });

    it("invalidates the jobs query and removes the individual job cache", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        queryClient.setQueryData(
            ["job", mockJob.id],
            mockJob
        );

        const invalidateSpy = vi.spyOn(
            queryClient,
            "invalidateQueries"
        );

        const removeSpy = vi.spyOn(
            queryClient,
            "removeQueries"
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: ["jobs"],
        });

        expect(removeSpy).toHaveBeenCalledWith({
            queryKey: ["job", mockJob.id],
        });
    });

    it("returns undefined as mutation data after successful deletion", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.data).toBeUndefined();
    });

    // ------------------------------------------------------------------ //
    //  onError                                                             //
    // ------------------------------------------------------------------ //

    it("shows an error toast on failure", async () => {
        vi.mocked(jobApi.deleteJob).mockRejectedValue(
            new Error("Network error")
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(toast.error).toHaveBeenCalledWith(
            "Failed to delete job"
        );
    });

    it("shows the backend error detail when available", async () => {
        const axiosError = {
            response: {
                data: {
                    detail: "Job cannot be deleted because it is assigned",
                },
            },
        };

        vi.mocked(jobApi.deleteJob).mockRejectedValue(axiosError);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(toast.error).toHaveBeenCalledWith(
            "Job cannot be deleted because it is assigned"
        );
    });

    it("does not show a success toast on failure", async () => {
        vi.mocked(jobApi.deleteJob).mockRejectedValue(
            new Error("Network error")
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(toast.success).not.toHaveBeenCalled();
    });

    it("does not invalidate queries on failure", async () => {
        vi.mocked(jobApi.deleteJob).mockRejectedValue(
            new Error("Network error")
        );

        const invalidateSpy = vi.spyOn(
            queryClient,
            "invalidateQueries"
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("does not remove the job cache on failure", async () => {
        vi.mocked(jobApi.deleteJob).mockRejectedValue(
            new Error("Network error")
        );

        queryClient.setQueryData(
            ["job", mockJob.id],
            mockJob
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(
            queryClient.getQueryData(["job", mockJob.id])
        ).toEqual(mockJob);
    });

    it("exposes the error object on failure", async () => {
        const error = new Error("Network error");

        vi.mocked(jobApi.deleteJob).mockRejectedValue(error);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.error).toBe(error);
    });

    // ------------------------------------------------------------------ //
    //  State transitions                                                   //
    // ------------------------------------------------------------------ //

    it("starts in idle state", () => {
        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it("transitions to success state after successful deletion", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        expect(result.current.isPending).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it("transitions to error state after failed deletion", async () => {
        vi.mocked(jobApi.deleteJob).mockRejectedValue(
            new Error("Delete failed")
        );

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isError).toBe(true);
        });

        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });

    it("resets to idle state after reset is called", async () => {
        vi.mocked(jobApi.deleteJob).mockResolvedValue(undefined);

        const {result} = renderHook(() => useDeleteJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(mockJob.id);

        await waitFor(() => {
            expect(result.current.isSuccess).toBe(true);
        });

        result.current.reset();

        await waitFor(() => {
            expect(result.current.isIdle).toBe(true);
        });
    });
});