import {beforeEach, describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {createElement} from "react";
import {useCreateJob} from "../../hooks/useCreateJob.ts";
import {toast} from "sonner";
import {mockJob} from "@/mocks";
import {jobApi} from "../../../../lib/api/jobApi.ts";
import {JobRead} from "@/features/job";
import {PaginatedListResponse} from "@/features/types.ts";

vi.mock("../../../../lib/api/jobApi");
vi.mock("sonner");


const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: React.ReactNode }) =>
        createElement(QueryClientProvider, {client: queryClient}, children);
};

const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    });

const validPayload = {
    title: "Fix leaking kitchen sink",
    description: "Pipe burst under the cabinet",
    trade_category_id: 1,
    budget_min: 75.00,
    budget_max: 200.00,
    display_location: "New York, NY",
    latitude: 40.7128,
    longitude: -74.006,
};

describe("useCreateJob", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.clearAllMocks();
    });

    // ------------------------------------------------------------------ //
    //  Mutation function                                                   //
    // ------------------------------------------------------------------ //

    it("calls jobApi.createJob with the correct payload", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(jobApi.createJob).toHaveBeenCalledOnce();
        expect(jobApi.createJob).toHaveBeenCalledWith(validPayload);
    });

    it("exposes isPending as true while the mutation is in flight", async () => {
        vi.mocked(jobApi.createJob).mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve(mockJob), 100))
        );

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isPending).toBe(true));
    });

    // ------------------------------------------------------------------ //
    //  onSuccess                                                           //
    // ------------------------------------------------------------------ //

    it("shows a success toast on successful creation", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalledWith("Job created successfully");
    });

    it("handles empty jobs list cache gracefully on success", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);
        // no cache seeded — old will be undefined

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        // setQueryData returns old (undefined) when no cache exists — no crash
        const cache = queryClient.getQueryData<PaginatedListResponse<JobRead>>(["jobs"]);
        expect(cache).toBeUndefined();
    });

    it("pre-populates the individual job cache on success", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const cached = queryClient.getQueryData(["job", mockJob.id]);
        expect(cached).toEqual(mockJob);
    });

    it("returns the created job as mutation data on success", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data).toEqual(mockJob);
    });

    // ------------------------------------------------------------------ //
    //  onError                                                             //
    // ------------------------------------------------------------------ //

    it("shows an error toast on failure", async () => {
        vi.mocked(jobApi.createJob).mockRejectedValue(new Error("Network error"));

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith("Failed to create job");
    });

    it("does not show a success toast on failure", async () => {
        vi.mocked(jobApi.createJob).mockRejectedValue(new Error("Network error"));

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.success).not.toHaveBeenCalled();
    });

    it("does not invalidate cache on failure", async () => {
        vi.mocked(jobApi.createJob).mockRejectedValue(new Error("Network error"));
        const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(invalidateSpy).not.toHaveBeenCalled();
    });

    it("exposes the error object on failure", async () => {
        const error = new Error("Network error");
        vi.mocked(jobApi.createJob).mockRejectedValue(error);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.error).toBe(error);
    });

    it("surfaces backend validation message in toast when available", async () => {
        const axiosError = {
            response: {data: {detail: "Maximum number of active jobs reached"}},
        };
        vi.mocked(jobApi.createJob).mockRejectedValue(axiosError);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith("Maximum number of active jobs reached");
    });

    // ------------------------------------------------------------------ //
    //  State transitions                                                   //
    // ------------------------------------------------------------------ //

    it("starts in idle state", () => {
        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        expect(result.current.isIdle).toBe(true);
        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it("transitions to success state after successful mutation", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.isPending).toBe(false);
        expect(result.current.isError).toBe(false);
    });

    it("transitions to error state after failed mutation", async () => {
        vi.mocked(jobApi.createJob).mockRejectedValue(new Error("fail"));

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(result.current.isPending).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });

    it("resets to idle state after reset is called", async () => {
        vi.mocked(jobApi.createJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useCreateJob(), {
            wrapper: createWrapper(queryClient),
        });

        result.current.mutate(validPayload);
        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        result.current.reset();
        await waitFor(() => expect(result.current.isIdle).toBe(true));
    });
});