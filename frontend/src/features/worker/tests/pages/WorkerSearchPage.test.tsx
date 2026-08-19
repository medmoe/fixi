import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {WorkerSearchPage} from "@/features/worker/pages/WorkerSearchPage";
import {useWorkerSearch} from "@/features/worker";
import {mockWorkers} from "../mocks";

vi.mock("@/features/worker", () => ({
    useWorkerSearch: vi.fn(),
    FilterPanel: vi.fn(({onChange}) => (
        <div data-testid="filter-panel">
            <button
                type="button"
                onClick={() => onChange({is_available: true})}
            >
                Update filters
            </button>
        </div>
    )),
    WorkerCard: vi.fn(({worker}) => (
        <div data-testid="worker-card">
            {worker.user.name}
        </div>
    )),
    WorkerCardSkeletonGrid: vi.fn(() => (
        <div data-testid="worker-skeleton-grid">
            Loading workers...
        </div>
    )),
    WorkerSearchEmptyState: vi.fn(() => (
        <div data-testid="empty-state">
            No workers found
        </div>
    )),
}));

vi.mock("@/components/ui/button", () => ({
    Button: vi.fn(
        ({
             children,
             onClick,
             disabled,
         }: {
            children: React.ReactNode;
            onClick?: () => void;
            disabled?: boolean;
        }) => (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
            >
                {children}
            </button>
        ),
    ),
}));

vi.mock("lucide-react", () => ({
    Loader2: vi.fn(() => (
        <span data-testid="loader-icon"/>
    )),
}));

const mockUseWorkerSearch = vi.mocked(useWorkerSearch);

const createSearchState = (
    overrides: Partial<ReturnType<typeof useWorkerSearch>> = {},
): ReturnType<typeof useWorkerSearch> => ({
    filters: {},
    updateFilters: vi.fn(),
    workers: [],
    totalCount: 0,
    hasMore: false,
    loadMore: vi.fn(),
    isLoading: false,
    isFetchingNextPage: false,
    isError: false,
    isFetching: false,
    error: null,
    ...overrides,
});


describe("WorkerSearchPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockUseWorkerSearch.mockReturnValue(
            createSearchState(),
        );
    });

    it("renders the filter panel", () => {
        render(<WorkerSearchPage/>);

        expect(
            screen.getByTestId("filter-panel"),
        ).toBeInTheDocument();
    });

    it("shows the number of workers found", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 2,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByText("2 workers found"),
        ).toBeInTheDocument();
    });

    it("shows Searching while loading", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                isLoading: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByText("Searching..."),
        ).toBeInTheDocument();
    });

    it("shows the skeleton grid while loading", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                isLoading: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByTestId("worker-skeleton-grid"),
        ).toBeInTheDocument();
    });

    it("shows an error message when the search fails", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                isError: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByText(
                "Something went wrong loading results. Please try again.",
            ),
        ).toBeInTheDocument();
    });

    it("shows the empty state when no workers are found", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: [],
                totalCount: 0,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByTestId("empty-state"),
        ).toBeInTheDocument();
    });

    it("does not show the empty state while loading", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                isLoading: true,
                workers: [],
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.queryByTestId("empty-state"),
        ).not.toBeInTheDocument();
    });

    it("renders a worker card for each worker", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 2,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getAllByTestId("worker-card"),
        ).toHaveLength(2);

        expect(
            screen.getByText("Worker 1"),
        ).toBeInTheDocument();

        expect(
            screen.getByText("Worker 2"),
        ).toBeInTheDocument();
    });

    it("does not show the worker cards when there is an error", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 2,
                isError: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.queryAllByTestId("worker-card"),
        ).toHaveLength(0)
    });

    it("shows the Load more button when more workers are available", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 10,
                hasMore: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByRole("button", {name: "Load more"}),
        ).toBeInTheDocument();
    });

    it("does not show the Load more button when there are no more workers", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 2,
                hasMore: false,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.queryByRole("button", {name: "Load more"}),
        ).not.toBeInTheDocument();
    });

    it("calls loadMore when Load more is clicked", async () => {
        const user = userEvent.setup();
        const loadMore = vi.fn();

        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 10,
                hasMore: true,
                loadMore,
            }),
        );

        render(<WorkerSearchPage/>);

        await act(async () => await user.click(
            screen.getByRole("button", {name: "Load more"}),
        ));

        expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("disables Load more while fetching the next page", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 10,
                hasMore: true,
                isFetchingNextPage: true,
            }),
        );

        render(<WorkerSearchPage/>);

        const button = screen.getByRole("button", {
            name: /Loading.../,
        });

        expect(button).toBeDisabled();
    });

    it("shows Loading while fetching the next page", () => {
        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                workers: mockWorkers,
                totalCount: 10,
                hasMore: true,
                isFetchingNextPage: true,
            }),
        );

        render(<WorkerSearchPage/>);

        expect(
            screen.getByText("Loading..."),
        ).toBeInTheDocument();

        expect(
            screen.getByTestId("loader-icon"),
        ).toBeInTheDocument();
    });

    it("calls updateFilters when FilterPanel changes filters", async () => {
        const user = userEvent.setup();
        const updateFilters = vi.fn();

        mockUseWorkerSearch.mockReturnValue(
            createSearchState({
                updateFilters,
            }),
        );

        render(<WorkerSearchPage/>);

        await act(async () => await user.click(
            screen.getByRole("button", {
                name: "Update filters",
            }),
        ));

        expect(updateFilters).toHaveBeenCalledWith({
            is_available: true,
        });
    });
});