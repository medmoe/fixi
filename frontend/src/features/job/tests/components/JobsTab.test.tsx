import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {JobsTab} from "../../components/JobsTab";
import {jobApi} from "@/lib";
import {useTrades} from "@/features/worker";

vi.mock("@/lib", () => ({jobApi: {getJobs: vi.fn()}}));
vi.mock("@/features/worker", () => ({useTrades: vi.fn()}));

const mockJob = (id: number, overrides: Partial<any> = {}) => ({
    id,
    title: `Fix sink ${id}`,
    status: "open",
    description: "Leaking pipe",
    trade_category_id: 1,
    user_id: 1,
    budget_min: 100,
    budget_max: 300,
    display_location: "Algiers, Algeria",
    created_at: "2026-01-01T00:00:00",
    updated_at: null,
    ...overrides,
});

const makePage = (jobs: any[], total_count?: number, has_more = false) => ({
    data: jobs,
    total_count: total_count ?? jobs.length,
    has_more,
    items_per_page: 20,
    page: 1,
});

const renderJobsTab = () => {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
                <JobsTab/>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe("JobsTab", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useTrades).mockReturnValue({
            data: [{id: 1, name: "plumbing", display_name: "Plumbing"}],
            isLoading: false,
        } as never);
    });

    it("renders the filter panel", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([]));
        renderJobsTab();
        expect(screen.getByLabelText("Job filters")).toBeInTheDocument();
    });

    it("shows loading skeletons while fetching", () => {
        vi.mocked(jobApi.getJobs).mockImplementation(() => new Promise(() => {
        }));
        renderJobsTab();
        expect(screen.getAllByRole("status", {name: /loading job/i}).length).toBeGreaterThan(0);
    });

    it("renders job cards once data loads", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([mockJob(1), mockJob(2)]));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText("Fix sink 1")).toBeInTheDocument();
            expect(screen.getByText("Fix sink 2")).toBeInTheDocument();
        });
    });

    it("shows the results count", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([mockJob(1)], 5));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText("5 jobs found")).toBeInTheDocument();
        });
    });

    it("shows an empty state when no jobs match", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([]));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText("No jobs found")).toBeInTheDocument();
        });
    });

    it("shows an error message on failure", async () => {
        vi.mocked(jobApi.getJobs).mockRejectedValue(new Error("Network error"));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText(/failed to load jobs/i)).toBeInTheDocument();
        });
    });

    it("displays the job status badge", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([mockJob(1, {status: "in_progress"})]));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText("in progress")).toBeInTheDocument();
        });
    });

    it("displays budget range when present", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(
            makePage([mockJob(1, {budget_min: 100, budget_max: 500})])
        );
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByText("$100 – $500")).toBeInTheDocument();
        });
    });

    it("shows a Load more button when hasMore is true", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([mockJob(1)], 10, true));
        renderJobsTab();
        await waitFor(() => {
            expect(screen.getByRole("button", {name: /load more/i})).toBeInTheDocument();
        });
    });

    it("does not show Load more when hasMore is false", async () => {
        vi.mocked(jobApi.getJobs).mockResolvedValue(makePage([mockJob(1)], 1, false));
        renderJobsTab();
        await waitFor(() => screen.getByText("Fix sink 1"));
        expect(screen.queryByRole("button", {name: /load more/i})).not.toBeInTheDocument();
    });
});