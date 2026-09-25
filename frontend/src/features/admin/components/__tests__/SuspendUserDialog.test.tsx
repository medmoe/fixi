import {describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {SuspendUserDialog} from "../SuspendUserDialog";

describe("SuspendUserDialog", () => {
    describe("suspend mode", () => {
        it("shows the suspend trigger button", () => {
            render(<SuspendUserDialog mode="suspend" isPending={false} onConfirm={vi.fn()}/>);
            expect(screen.getByRole("button", {name: "Suspend account"})).toBeInTheDocument();
        });

        it("shows the suspend confirmation copy once opened", async () => {
            const user = userEvent.setup();
            render(<SuspendUserDialog mode="suspend" isPending={false} onConfirm={vi.fn()}/>);

            await act(async () => await user.click(screen.getByRole("button", {name: "Suspend account"})));

            expect(screen.getByText("Suspend this account?")).toBeInTheDocument();
        });

        it("calls onConfirm with the entered reason", async () => {
            const user = userEvent.setup();
            const onConfirm = vi.fn();
            render(<SuspendUserDialog mode="suspend" isPending={false} onConfirm={onConfirm}/>);

            await act(async () => await user.click(screen.getByRole("button", {name: "Suspend account"})));
            await act(async () => await user.type(screen.getByPlaceholderText("Reason (optional)"), "Fraud report"));
            const actionButtons = screen.getAllByText("Suspend account");
            await act(async () => await user.click(actionButtons[actionButtons.length - 1]));

            expect(onConfirm).toHaveBeenCalledWith("Fraud report");
        });

        it("calls onConfirm with undefined when no reason is given", async () => {
            const user = userEvent.setup();
            const onConfirm = vi.fn();
            render(<SuspendUserDialog mode="suspend" isPending={false} onConfirm={onConfirm}/>);

            await act(async () => await user.click(screen.getByRole("button", {name: "Suspend account"})));
            const actionButtons = screen.getAllByText("Suspend account");
            await act(async () => await user.click(actionButtons[actionButtons.length - 1]));

            expect(onConfirm).toHaveBeenCalledWith(undefined);
        });

        it("disables the confirm button while pending", async () => {
            const user = userEvent.setup();
            render(<SuspendUserDialog mode="suspend" isPending={true} onConfirm={vi.fn()}/>);

            await act(async () => await user.click(screen.getByRole("button", {name: "Suspend account"})));

            expect(screen.getByText("Saving...")).toBeInTheDocument();
        });
    });

    describe("reactivate mode", () => {
        it("shows the reactivate trigger button", () => {
            render(<SuspendUserDialog mode="reactivate" isPending={false} onConfirm={vi.fn()}/>);
            expect(screen.getByRole("button", {name: "Reactivate account"})).toBeInTheDocument();
        });

        it("shows the reactivate confirmation copy once opened", async () => {
            const user = userEvent.setup();
            render(<SuspendUserDialog mode="reactivate" isPending={false} onConfirm={vi.fn()}/>);

            await act(async () => await user.click(screen.getByRole("button", {name: "Reactivate account"})));

            expect(screen.getByText("Reactivate this account?")).toBeInTheDocument();
        });
    });
});
