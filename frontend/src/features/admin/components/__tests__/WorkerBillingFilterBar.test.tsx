import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {WorkerBillingFilterBar} from "../WorkerBillingFilterBar";
import type {WorkerBillingAdminFilters} from "../../types/workerBilling.types";

vi.mock("@/components/ui/select", () => ({
    Select: ({children, onValueChange, value}: any) => (
        <select data-testid="mocked-select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
            {children}
        </select>
    ),
    SelectTrigger: ({children}: any) => <>{children}</>,
    SelectValue: ({placeholder}: any) => <option>{placeholder}</option>,
    SelectContent: ({children}: any) => <>{children}</>,
    SelectItem: ({value, children}: any) => <option value={value}>{children}</option>,
}));

describe("WorkerBillingFilterBar", () => {
    let onChange: (partial: Partial<WorkerBillingAdminFilters>) => void;

    beforeEach(() => {
        onChange = vi.fn();
    });

    const renderBar = (filters: WorkerBillingAdminFilters = {}) =>
        render(<WorkerBillingFilterBar filters={filters} onChange={onChange}/>);

    it("calls onChange with the selected status", async () => {
        renderBar();
        await userEvent.selectOptions(screen.getByTestId("mocked-select"), "overdue");
        expect(onChange).toHaveBeenCalledWith({status: "overdue"});
    });

    it("calls onChange with undefined when All statuses is selected", async () => {
        renderBar({status: "paid"});
        await userEvent.selectOptions(screen.getByTestId("mocked-select"), "all");
        expect(onChange).toHaveBeenCalledWith({status: undefined});
    });

    it("calls onChange with an ISO due_date_from when the from date changes", () => {
        renderBar();
        fireEvent.change(screen.getByLabelText("Due date from"), {target: {value: "2026-10-01"}});
        expect(onChange).toHaveBeenCalledWith({due_date_from: "2026-10-01T00:00:00Z"});
    });

    it("calls onChange with an ISO due_date_to when the to date changes", () => {
        renderBar();
        fireEvent.change(screen.getByLabelText("Due date to"), {target: {value: "2026-10-31"}});
        expect(onChange).toHaveBeenCalledWith({due_date_to: "2026-10-31T23:59:59Z"});
    });

    it("clears due_date_from when the input is emptied", () => {
        renderBar({due_date_from: "2026-10-01T00:00:00Z"});
        fireEvent.change(screen.getByLabelText("Due date from"), {target: {value: ""}});
        expect(onChange).toHaveBeenCalledWith({due_date_from: undefined});
    });

    it("clears all filters when Clear filters is clicked", async () => {
        renderBar({status: "paid", due_date_from: "2026-10-01T00:00:00Z", due_date_to: "2026-10-31T23:59:59Z"});
        await userEvent.click(screen.getByRole("button", {name: "Clear filters"}));
        expect(onChange).toHaveBeenCalledWith({status: undefined, due_date_from: undefined, due_date_to: undefined});
    });
});
