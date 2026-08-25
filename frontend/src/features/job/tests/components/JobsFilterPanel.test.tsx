import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {JobsFilterPanel} from "../../components/JobsFilterPanel";
import {useTrades} from "@/features/worker";
import type {JobFilters} from "../../types";

vi.mock("@/features/worker", () => ({useTrades: vi.fn()}));

const mockCategories = [
    {id: 1, name: "plumbing", display_name: "Plumbing"},
    {id: 2, name: "electrical", display_name: "Electrical"},
];

const createWrapper = () => {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("Job FilterPanel", () => {
    let onChange: (partial: Partial<JobFilters>) => void;

    beforeEach(() => {
        vi.clearAllMocks();
        onChange = vi.fn((_: Partial<JobFilters>) => {
        });
        vi.mocked(useTrades).mockReturnValue({data: mockCategories, isLoading: false} as never);
    });

    const renderPanel = (filters: JobFilters = {}) =>
        render(<JobsFilterPanel filters={filters} onChange={onChange}/>, {wrapper: createWrapper()});

    describe("search", () => {
        it("calls onChange when typing in the search field", async () => {
            renderPanel();
            await act(async () => {
                await userEvent.type(screen.getByLabelText("Search jobs"), "sink");
            });
            expect(onChange).toHaveBeenLastCalledWith({search: "k"});
        });

        it("passes undefined when the search field is cleared", async () => {
            renderPanel({search: "sink"});
            await act(async () => {
                await userEvent.clear(screen.getByLabelText("Search jobs"));
            });
            expect(onChange).toHaveBeenCalledWith({search: undefined});
        });
    });

    describe("status", () => {
        it("renders All statuses by default", () => {
            renderPanel();
            expect(screen.getByLabelText("Job status")).toHaveTextContent("All statuses");
        });

        it("shows the active status when set", () => {
            renderPanel({status: "open"});
            expect(screen.getByLabelText("Job status")).toHaveTextContent("Open");
        });

        it("calls onChange with the selected status", async () => {
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByLabelText("Job status"));
            });
            await act(async () => {
                await userEvent.click(screen.getByText("Open"));
            });
            expect(onChange).toHaveBeenCalledWith({status: "open"});
        });

        it("calls onChange with undefined when All statuses is selected", async () => {
            renderPanel({status: "open"});
            await act(async () => {
                await userEvent.click(screen.getByLabelText("Job status"));
            });
            await act(async () => {
                await userEvent.click(screen.getByText("All statuses"));
            });
            expect(onChange).toHaveBeenCalledWith({status: undefined});
        });
    });

    describe("trade category", () => {
        it("renders trade categories once loaded", async () => {
            renderPanel();
            await waitFor(() => {
                expect(screen.getByText("Plumbing")).toBeInTheDocument();
                expect(screen.getByText("Electrical")).toBeInTheDocument();
            });
        });

        it("renders category badges with role checkbox", async () => {
            renderPanel();
            await waitFor(() => {
                expect(screen.getByText("Plumbing").closest('[role="checkbox"]')).toBeInTheDocument();
            });
        });

        it("calls onChange with trade_category_id on click", async () => {
            renderPanel();
            await waitFor(() => screen.getByText("Plumbing"));
            await act(async () => {
                await userEvent.click(screen.getByText("Plumbing"));
            });
            expect(onChange).toHaveBeenCalledWith({trade_category_id: 1});
        });

        it("clears trade_category_id when already-selected category clicked again", async () => {
            renderPanel({trade_category_id: 1});
            await waitFor(() => screen.getByText("Plumbing"));
            await act(async () => {
                await userEvent.click(screen.getByText("Plumbing"));
            });
            expect(onChange).toHaveBeenCalledWith({trade_category_id: undefined});
        });

        it("shows a loading message while categories are fetching", () => {
            vi.mocked(useTrades).mockReturnValue({data: [], isLoading: true} as never);
            renderPanel();
            expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
        });
    });

    describe("budget range", () => {
        it("calls onChange with a number when min budget is typed", async () => {
            renderPanel();
            await act(async () => {
                await userEvent.type(screen.getByLabelText("Minimum budget"), "100");
            });
            expect(onChange).toHaveBeenLastCalledWith({budget_min: 0});
        });

        it("calls onChange with undefined when budget field is cleared", async () => {
            renderPanel({budget_min: 100});
            await act(async () => {
                await userEvent.clear(screen.getByLabelText("Minimum budget"));
            });
            expect(onChange).toHaveBeenCalledWith({budget_min: undefined});
        });

        it("renders pre-filled budget values", () => {
            renderPanel({budget_min: 100, budget_max: 500});
            expect(screen.getByLabelText("Minimum budget")).toHaveValue(100);
            expect(screen.getByLabelText("Maximum budget")).toHaveValue(500);
        });
    });

    describe("clear filters", () => {
        it("calls onChange with everything undefined", async () => {
            renderPanel({status: "open", trade_category_id: 1, search: "sink"});
            await act(async () => {
                await userEvent.click(screen.getByRole("button", {name: /clear filters/i}));
            });
            expect(onChange).toHaveBeenCalledWith({
                search: undefined,
                status: undefined,
                trade_category_id: undefined,
                budget_min: undefined,
                budget_max: undefined,
            });
        });
    });
});