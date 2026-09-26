import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {WorkerBillingTable} from "../WorkerBillingTable";
import type {WorkerBillingAdminRead} from "../../types/workerBilling.types";

const records: WorkerBillingAdminRead[] = [
    {
        id: 1, worker_profile_id: 1, worker_name: "Ali", worker_email: "ali@example.com", job_id: 1,
        amount_owed: "5.00", amount_paid: "0.00", due_date: "2026-10-01T00:00:00Z",
        status: "pending", is_overdue: false, payment_id: null, created_at: "2026-09-01T00:00:00Z",
    },
    {
        id: 2, worker_profile_id: 2, worker_name: "Sara", worker_email: "sara@example.com", job_id: 2,
        amount_owed: "10.00", amount_paid: "10.00", due_date: "2026-08-01T00:00:00Z",
        status: "paid", is_overdue: false, payment_id: 5, created_at: "2026-07-01T00:00:00Z",
    },
];

describe("WorkerBillingTable", () => {
    it("renders a row per record", () => {
        render(<WorkerBillingTable records={records} onMarkPaid={vi.fn()}/>);
        expect(screen.getAllByTestId("worker-billing-row")).toHaveLength(2);
    });

    it("shows each worker's name and email", () => {
        render(<WorkerBillingTable records={records} onMarkPaid={vi.fn()}/>);
        expect(screen.getByText("Ali")).toBeInTheDocument();
        expect(screen.getByText("ali@example.com")).toBeInTheDocument();
        expect(screen.getByText("Sara")).toBeInTheDocument();
    });

    it("shows a mark-paid button for non-paid records only", () => {
        render(<WorkerBillingTable records={records} onMarkPaid={vi.fn()}/>);
        expect(screen.getAllByRole("button", {name: /mark as paid/i})).toHaveLength(1);
    });

    it("calls onMarkPaid with the record id", async () => {
        const user = userEvent.setup();
        const onMarkPaid = vi.fn();
        render(<WorkerBillingTable records={records} onMarkPaid={onMarkPaid}/>);

        await user.click(screen.getByRole("button", {name: /mark as paid/i}));

        expect(onMarkPaid).toHaveBeenCalledWith(1);
    });

    it("disables the mark-paid button for the record currently being marked", () => {
        render(<WorkerBillingTable records={records} onMarkPaid={vi.fn()} markingPaidId={1}/>);
        expect(screen.getByRole("button", {name: /mark as paid/i})).toBeDisabled();
    });
});
