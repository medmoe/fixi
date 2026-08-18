import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {FilterPanel, TradeCategoryRead, TradeCategoryWithChildren} from "@/features/worker";
import {workerApi} from "@/lib";
import {createQueryClient, createWrapper} from "../helpers.tsx";
import type {WorkerSearchFilters} from "../../types";
import {QueryClient} from "@tanstack/react-query";

vi.mock("@/lib", () => ({
    workerApi: {
        getTrades: vi.fn()
    }
}))

const mockCategories: TradeCategoryRead[] | TradeCategoryWithChildren[] = [
    {id: 1, name: "plumbing", display_name: "Plumbing", icon_name: "wrench", created_at: '2025-01-01', parent_id: null},
    {id: 2, name: "electrical", display_name: "Electrical", icon_name: "wrench", created_at: '2025-01-01', parent_id: null},
];


describe("FilterPanel", () => {
    const onChange = vi.fn<(partial: Partial<WorkerSearchFilters>) => void>()
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = createQueryClient();
        vi.clearAllMocks();
        vi.mocked(workerApi.getTrades).mockResolvedValue(mockCategories);
    });

    const renderPanel = (filters: WorkerSearchFilters = {}) =>
        render(<FilterPanel filters={filters} onChange={onChange}/>, {wrapper: createWrapper(queryClient)});

    // ------------------------------------------------------------------ //
    //  Trade category                                                      //
    // ------------------------------------------------------------------ //

    it("renders trade categories once loaded", async () => {
        renderPanel();
        await waitFor(() => {
            expect(screen.getByText("Plumbing")).toBeInTheDocument();
            expect(screen.getByText("Electrical")).toBeInTheDocument();
        });
    });

    it("calls onChange with trade_category_id when a category is clicked", async () => {
        renderPanel();
        await waitFor(() => screen.getByText("Plumbing"));

        await act(async () => {
            await userEvent.click(screen.getByText("Plumbing"));
        });

        expect(onChange).toHaveBeenCalledWith({trade_category_id: 1});
    });

    it("clears trade_category_id when the same selected category is clicked again", async () => {
        renderPanel({trade_category_id: 1});
        await waitFor(() => screen.getByText("Plumbing"));

        await act(async () => {
            await userEvent.click(screen.getByText("Plumbing"));
        });

        expect(onChange).toHaveBeenCalledWith({trade_category_id: undefined});
    });

    it("marks the selected category as checked", async () => {
        renderPanel({trade_category_id: 1});
        await waitFor(() => {
            expect(screen.getByText("Plumbing")).toHaveAttribute("aria-checked", "true");
            expect(screen.getByText("Electrical")).toHaveAttribute("aria-checked", "false");
        });
    });

    // ------------------------------------------------------------------ //
    //  Hourly rate slider                                                  //
    // ------------------------------------------------------------------ //

    it("renders the hourly rate range label with defaults", () => {
        renderPanel();
        expect(screen.getByText(/hourly rate: \$0 – \$500/i)).toBeInTheDocument();
    });

    it("renders the hourly rate range label with active filter values", () => {
        renderPanel({min_hourly_rate: 50, max_hourly_rate: 200});
        expect(screen.getByText(/hourly rate: \$50 – \$200/i)).toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    //  Service radius slider                                               //
    // ------------------------------------------------------------------ //

    it("renders the service radius label with default", () => {
        renderPanel();
        expect(screen.getByText(/service radius: 200 km/i)).toBeInTheDocument();
    });

    it("renders the service radius label with active filter value", () => {
        renderPanel({service_radius_km: 25});
        expect(screen.getByText(/service radius: 25 km/i)).toBeInTheDocument();
    });

    // ------------------------------------------------------------------ //
    //  Availability toggle                                                 //
    // ------------------------------------------------------------------ //

    it("renders availability toggle unchecked by default", () => {
        renderPanel();
        expect(screen.getByLabelText("Available now")).not.toBeChecked();
    });

    it("renders availability toggle checked when filter is active", () => {
        renderPanel({is_available: true});
        expect(screen.getByLabelText("Available now")).toBeChecked();
    });

    it("calls onChange when availability toggle is switched on", async () => {
        renderPanel();
        await act(async () => {
            await userEvent.click(screen.getByLabelText("Available now"));
        });
        expect(onChange).toHaveBeenCalledWith({is_available: true});
    });

    it("calls onChange with undefined when availability toggle is switched off", async () => {
        renderPanel({is_available: true});
        await act(async () => {
            await userEvent.click(screen.getByLabelText("Available now"));
        });
        expect(onChange).toHaveBeenCalledWith({is_available: undefined});
    });

    // ------------------------------------------------------------------ //
    //  Verified checkbox                                                   //
    // ------------------------------------------------------------------ //

    it("renders verified checkbox unchecked by default", () => {
        renderPanel();
        expect(screen.getByLabelText("Verified only")).not.toBeChecked();
    });

    it("calls onChange when verified checkbox is checked", async () => {
        renderPanel();
        await act(async () => {
            await userEvent.click(screen.getByLabelText("Verified only"));
        });
        expect(onChange).toHaveBeenCalledWith({is_verified: true});
    });

    // ------------------------------------------------------------------ //
    //  Clear filters                                                        //
    // ------------------------------------------------------------------ //

    it("calls onChange with all fields undefined when Clear filters is clicked", async () => {
        renderPanel({trade_category_id: 1, is_available: true, is_verified: true});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /clear filters/i}));
        });
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                trade_category_id: undefined,
                is_available: undefined,
                is_verified: undefined,
            })
        );
    });

    // ------------------------------------------------------------------ //
    //  Loading state                                                        //
    // ------------------------------------------------------------------ //

    it("shows a loading message while categories are fetching", () => {
        vi.mocked(workerApi.getTrades).mockImplementation(
            () => new Promise(() => {
            }) // never resolves
        );
        renderPanel();
        expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
    });
});