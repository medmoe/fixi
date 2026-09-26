import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {AdminBillingDashboardPage} from "../AdminBillingDashboardPage";
import {useWorkerBillingDashboard} from "../../hooks/useWorkerBillingDashboard";
import {useMarkWorkerBillingPaid} from "../../hooks/useMarkWorkerBillingPaid";
import {useExportWorkerBillingCsv} from "../../hooks/useExportWorkerBillingCsv";

vi.mock("../../hooks/useWorkerBillingDashboard", () => ({useWorkerBillingDashboard: vi.fn()}));
vi.mock("../../hooks/useMarkWorkerBillingPaid", () => ({useMarkWorkerBillingPaid: vi.fn()}));
vi.mock("../../hooks/useExportWorkerBillingCsv", () => ({useExportWorkerBillingCsv: vi.fn()}));
vi.mock("@/features/worker", () => ({useDownloadInvoice: () => ({mutate: vi.fn(), isPending: false, variables: undefined})}));

vi.mock("../../components/WorkerBillingFilterBar", () => ({
    WorkerBillingFilterBar: () => <div data-testid="filter-bar"/>,
}));
vi.mock("../../components/WorkerBillingTable", () => ({
    WorkerBillingTable: vi.fn(({records, onMarkPaid}: any) => (
        <div data-testid="billing-table">
            {records.map((r: any) => (
                <button key={r.id} type="button" onClick={() => onMarkPaid(r.id)}>Mark paid {r.worker_name}</button>
            ))}
        </div>
    )),
}));

const mockUseDashboard = vi.mocked(useWorkerBillingDashboard);
const mockUseMarkPaid = vi.mocked(useMarkWorkerBillingPaid);
const mockUseExport = vi.mocked(useExportWorkerBillingCsv);

const mockRecords = [
    {id: 1, worker_profile_id: 1, worker_name: "Ali", worker_email: "ali@example.com", job_id: 1, amount_owed: "5.00", amount_paid: "0.00", due_date: "2026-10-01T00:00:00Z", status: "pending", is_overdue: false, payment_id: null, created_at: "2026-09-01T00:00:00Z"},
];

describe("AdminBillingDashboardPage", () => {
    const mockMarkPaid = vi.fn();
    const mockExport = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: [], isLoading: false, isError: false} as any);
        mockUseMarkPaid.mockReturnValue({mutate: mockMarkPaid, isPending: false, variables: undefined} as any);
        mockUseExport.mockReturnValue({mutate: mockExport, isPending: false} as any);
    });

    it("shows a loading message while loading", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: [], isLoading: true, isError: false} as any);
        render(<AdminBillingDashboardPage/>);
        expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    });

    it("shows an error message when the query fails", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: [], isLoading: false, isError: true} as any);
        render(<AdminBillingDashboardPage/>);
        expect(screen.getByText("Something went wrong loading commission records. Please try again.")).toBeInTheDocument();
    });

    it("shows the empty state when there are no records", () => {
        render(<AdminBillingDashboardPage/>);
        expect(screen.getByText("No commission records match these filters.")).toBeInTheDocument();
    });

    it("shows the record count", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: mockRecords, isLoading: false, isError: false} as any);
        render(<AdminBillingDashboardPage/>);
        expect(screen.getByText("1 record found")).toBeInTheDocument();
    });

    it("renders the table when there are records", () => {
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: mockRecords, isLoading: false, isError: false} as any);
        render(<AdminBillingDashboardPage/>);
        expect(screen.getByTestId("billing-table")).toBeInTheDocument();
    });

    it("calls the mark-paid mutation with the record id", async () => {
        const user = userEvent.setup();
        mockUseDashboard.mockReturnValue({filters: {}, updateFilters: vi.fn(), records: mockRecords, isLoading: false, isError: false} as any);
        render(<AdminBillingDashboardPage/>);

        await user.click(screen.getByRole("button", {name: "Mark paid Ali"}));

        expect(mockMarkPaid).toHaveBeenCalledWith(1);
    });

    it("calls the export mutation with the current filters when Export CSV is clicked", async () => {
        const user = userEvent.setup();
        mockUseDashboard.mockReturnValue({filters: {status: "paid"}, updateFilters: vi.fn(), records: mockRecords, isLoading: false, isError: false} as any);
        render(<AdminBillingDashboardPage/>);

        await user.click(screen.getByRole("button", {name: /export csv/i}));

        expect(mockExport).toHaveBeenCalledWith({status: "paid"});
    });
});
