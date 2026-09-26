import {describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {RejectVerificationDialog} from "../RejectVerificationDialog";

describe("RejectVerificationDialog", () => {
    it("shows the reject trigger button", () => {
        render(<RejectVerificationDialog isPending={false} onConfirm={vi.fn()}/>);
        expect(screen.getByRole("button", {name: "Reject"})).toBeInTheDocument();
    });

    it("shows the confirmation copy once opened", async () => {
        const user = userEvent.setup();
        render(<RejectVerificationDialog isPending={false} onConfirm={vi.fn()}/>);

        await act(async () => await user.click(screen.getByRole("button", {name: "Reject"})));

        expect(screen.getByText("Reject this verification?")).toBeInTheDocument();
    });

    it("disables confirm until a reason is entered", async () => {
        const user = userEvent.setup();
        render(<RejectVerificationDialog isPending={false} onConfirm={vi.fn()}/>);

        await act(async () => await user.click(screen.getByRole("button", {name: "Reject"})));
        const actionButtons = screen.getAllByText("Reject");

        expect(actionButtons[actionButtons.length - 1]).toBeDisabled();
    });

    it("calls onConfirm with the trimmed reason once entered", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<RejectVerificationDialog isPending={false} onConfirm={onConfirm}/>);

        await act(async () => await user.click(screen.getByRole("button", {name: "Reject"})));
        await act(async () => await user.type(screen.getByPlaceholderText("Explain why this document was rejected"), "  Blurry photo  "));

        const actionButtons = screen.getAllByText("Reject");
        expect(actionButtons[actionButtons.length - 1]).not.toBeDisabled();
        await act(async () => await user.click(actionButtons[actionButtons.length - 1]));

        expect(onConfirm).toHaveBeenCalledWith("Blurry photo");
    });

    it("does not call onConfirm for a whitespace-only reason", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<RejectVerificationDialog isPending={false} onConfirm={onConfirm}/>);

        await act(async () => await user.click(screen.getByRole("button", {name: "Reject"})));
        await act(async () => await user.type(screen.getByPlaceholderText("Explain why this document was rejected"), "   "));

        const actionButtons = screen.getAllByText("Reject");
        expect(actionButtons[actionButtons.length - 1]).toBeDisabled();
    });

    it("shows Saving... and disables confirm while pending", async () => {
        const user = userEvent.setup();
        render(<RejectVerificationDialog isPending={true} onConfirm={vi.fn()}/>);

        await act(async () => await user.click(screen.getByRole("button", {name: "Reject"})));

        expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
});
