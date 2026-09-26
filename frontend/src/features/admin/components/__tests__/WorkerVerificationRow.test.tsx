import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {WorkerVerificationRow} from "../WorkerVerificationRow";
import type {WorkerVerificationQueueRead} from "../../types/workerVerification.types";

vi.mock("../RejectVerificationDialog", () => ({
    RejectVerificationDialog: ({onConfirm}: any) => (
        <button type="button" onClick={() => onConfirm("test reason")}>
            Reject
        </button>
    ),
}));

vi.mock("lucide-react", () => ({
    FileText: () => <span data-testid="file-icon"/>,
    Loader2: () => <span data-testid="loader-icon"/>,
}));

const entry: WorkerVerificationQueueRead = {
    id: 1,
    user_id: 2,
    name: "Ali",
    email: "ali@example.com",
    bio: "Experienced plumber",
    years_of_experience: 5,
};

const defaultProps = {
    entry,
    onViewDocument: vi.fn(),
    isLoadingDocument: false,
    onApprove: vi.fn(),
    isApproving: false,
    onReject: vi.fn(),
    isRejecting: false,
};

describe("WorkerVerificationRow", () => {
    it("shows the worker's name, email, and bio", () => {
        render(<WorkerVerificationRow {...defaultProps}/>);
        expect(screen.getByText("Ali")).toBeInTheDocument();
        expect(screen.getByText("ali@example.com")).toBeInTheDocument();
        expect(screen.getByText("Experienced plumber")).toBeInTheDocument();
    });

    it("shows years of experience when present", () => {
        render(<WorkerVerificationRow {...defaultProps}/>);
        expect(screen.getByText("5 years of experience")).toBeInTheDocument();
    });

    it("does not show years of experience when null", () => {
        render(<WorkerVerificationRow {...defaultProps} entry={{...entry, years_of_experience: null}}/>);
        expect(screen.queryByText(/years of experience/)).not.toBeInTheDocument();
    });

    it("calls onViewDocument with the worker profile id", async () => {
        const user = userEvent.setup();
        const onViewDocument = vi.fn();
        render(<WorkerVerificationRow {...defaultProps} onViewDocument={onViewDocument}/>);

        await user.click(screen.getByRole("button", {name: /view document/i}));

        expect(onViewDocument).toHaveBeenCalledWith(1);
    });

    it("calls onApprove with the worker profile id", async () => {
        const user = userEvent.setup();
        const onApprove = vi.fn();
        render(<WorkerVerificationRow {...defaultProps} onApprove={onApprove}/>);

        await user.click(screen.getByRole("button", {name: "Approve"}));

        expect(onApprove).toHaveBeenCalledWith(1);
    });

    it("calls onReject with the worker profile id and reason", async () => {
        const user = userEvent.setup();
        const onReject = vi.fn();
        render(<WorkerVerificationRow {...defaultProps} onReject={onReject}/>);

        await user.click(screen.getByRole("button", {name: "Reject"}));

        expect(onReject).toHaveBeenCalledWith(1, "test reason");
    });

    it("disables the view document button while loading", () => {
        render(<WorkerVerificationRow {...defaultProps} isLoadingDocument={true}/>);
        expect(screen.getByRole("button", {name: /view document/i})).toBeDisabled();
    });

    it("disables the approve button while approving", () => {
        render(<WorkerVerificationRow {...defaultProps} isApproving={true}/>);
        expect(screen.getByRole("button", {name: "Approve"})).toBeDisabled();
    });
});
