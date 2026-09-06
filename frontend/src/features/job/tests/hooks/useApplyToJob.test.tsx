import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {useApplyToJob} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";

vi.mock("@/lib", () => ({jobApi: {applyToJob: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("useApplyToJob", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
    });

    it("calls jobApi.applyToJob with the correct jobId and payload", async () => {
        vi.mocked(jobApi.applyToJob).mockResolvedValue({id: 1, message: null, status: "pending", job: null, worker_profile: null});

        const {result} = renderHook(() => useApplyToJob(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({message: "hello"});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(jobApi.applyToJob).toHaveBeenCalledWith(42, {message: "hello"});
    });

    it("shows a success toast and invalidates the job cache on success", async () => {
        vi.mocked(jobApi.applyToJob).mockResolvedValue({id: 1, message: null, status: "pending", job: null, worker_profile: null});
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const {result} = renderHook(() => useApplyToJob(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(toast.success).toHaveBeenCalledWith("Application submitted!");
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ["job", 42]});
    });

    it("shows an error toast on failure", async () => {
        vi.mocked(jobApi.applyToJob).mockRejectedValue({
            response: {data: {detail: "You have already applied to this job"}},
        });

        const {result} = renderHook(() => useApplyToJob(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(toast.error).toHaveBeenCalledWith("You have already applied to this job");
    });

    it("invalidates the job cache when the error is a 'not OPEN' race condition", async () => {
        vi.mocked(jobApi.applyToJob).mockRejectedValue({
            response: {data: {detail: "Cannot apply to a job that is not OPEN. Current status: closed"}},
        });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const {result} = renderHook(() => useApplyToJob(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ["job", 42]});
    });

    it("does not invalidate the job cache for an unrelated error", async () => {
        vi.mocked(jobApi.applyToJob).mockRejectedValue({
            response: {data: {detail: "Network error"}},
        });
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const {result} = renderHook(() => useApplyToJob(42), {wrapper: createWrapper(queryClient)});
        result.current.mutate({});

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(invalidateSpy).not.toHaveBeenCalled();
    });
});