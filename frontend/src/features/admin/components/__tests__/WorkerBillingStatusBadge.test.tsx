import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {WorkerBillingStatusBadge} from "../WorkerBillingStatusBadge";

describe("WorkerBillingStatusBadge", () => {
    it("shows Paid when status is paid", () => {
        render(<WorkerBillingStatusBadge status="paid" isOverdue={false}/>);
        expect(screen.getByText("Paid")).toBeInTheDocument();
    });

    it("shows Paid even if somehow flagged overdue", () => {
        render(<WorkerBillingStatusBadge status="paid" isOverdue={true}/>);
        expect(screen.getByText("Paid")).toBeInTheDocument();
    });

    it("shows Overdue when pending and past due", () => {
        render(<WorkerBillingStatusBadge status="pending" isOverdue={true}/>);
        expect(screen.getByText("Overdue")).toBeInTheDocument();
    });

    it("shows Pending when pending and not yet due", () => {
        render(<WorkerBillingStatusBadge status="pending" isOverdue={false}/>);
        expect(screen.getByText("Pending")).toBeInTheDocument();
    });
});
