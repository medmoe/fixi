import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {PermanentDeleteUserDialog} from "../PermanentDeleteUserDialog";

const open = async (onConfirm = vi.fn(), isPending = false) => {
    render(<PermanentDeleteUserDialog username="john_doe" isPending={isPending} onConfirm={onConfirm}/>);
    await userEvent.click(screen.getByRole("button", {name: "Delete permanently"}));
    return onConfirm;
};

const confirmButton = () => {
    const buttons = screen.getAllByRole("button", {name: /Delete permanently|Deleting/});
    return buttons[buttons.length - 1];
};

describe("PermanentDeleteUserDialog", () => {
    it("lists what will be deleted", async () => {
        await open();
        expect(screen.getByText("This cannot be undone. It will delete:")).toBeInTheDocument();
        expect(screen.getByText(/Commission and payment records/)).toBeInTheDocument();
    });

    it("keeps the confirm button disabled until the exact username is typed", async () => {
        await open();

        expect(confirmButton()).toBeDisabled();
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "john_do");
        expect(confirmButton()).toBeDisabled();
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "e");
        expect(confirmButton()).toBeEnabled();
    });

    it("passes the trimmed reason, or undefined when empty", async () => {
        const onConfirm = await open();
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "john_doe");
        await userEvent.type(screen.getByLabelText("Reason"), "  GDPR request #7  ");

        await userEvent.click(confirmButton());

        expect(onConfirm).toHaveBeenCalledWith("GDPR request #7");
    });

    it("sends no reason when left blank", async () => {
        const onConfirm = await open();
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "john_doe");

        await userEvent.click(confirmButton());

        expect(onConfirm).toHaveBeenCalledWith(undefined);
    });

    it("clears what was typed when the dialog is closed and reopened", async () => {
        await open();
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "john_doe");
        await userEvent.click(screen.getByRole("button", {name: "Cancel"}));

        await userEvent.click(screen.getByRole("button", {name: "Delete permanently"}));

        expect(screen.getByLabelText("Type john_doe to confirm")).toHaveValue("");
    });

    it("stays disabled while the delete is in flight", async () => {
        render(<PermanentDeleteUserDialog username="john_doe" isPending={true} onConfirm={vi.fn()}/>);
        await userEvent.click(screen.getByRole("button", {name: "Delete permanently"}));
        await userEvent.type(screen.getByLabelText("Type john_doe to confirm"), "john_doe");
        expect(screen.getByRole("button", {name: "Deleting..."})).toBeDisabled();
    });
});
