import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {AdminUserFilterBar} from "../AdminUserFilterBar";
import type {AdminUserFilters} from "../../types/adminUser.types";

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

describe("AdminUserFilterBar", () => {
    let onChange: (partial: Partial<AdminUserFilters>) => void;

    beforeEach(() => {
        onChange = vi.fn();
    });

    const renderBar = (filters: AdminUserFilters = {}) =>
        render(<AdminUserFilterBar filters={filters} onChange={onChange}/>);

    it("calls onChange when typing in the search field", async () => {
        renderBar();
        await userEvent.type(screen.getByPlaceholderText("Search by name, username, or email"), "j");
        expect(onChange).toHaveBeenCalledWith({search: "j"});
    });

    it("passes undefined when the search field is cleared", async () => {
        renderBar({search: "john"});
        await userEvent.clear(screen.getByPlaceholderText("Search by name, username, or email"));
        expect(onChange).toHaveBeenCalledWith({search: undefined});
    });

    it("calls onChange with the selected role", async () => {
        renderBar();
        const [roleSelect] = screen.getAllByTestId("mocked-select");
        await userEvent.selectOptions(roleSelect, "worker");
        expect(onChange).toHaveBeenCalledWith({role_type: "worker"});
    });

    it("calls onChange with undefined when All roles is selected", async () => {
        renderBar({role_type: "worker"});
        const [roleSelect] = screen.getAllByTestId("mocked-select");
        await userEvent.selectOptions(roleSelect, "all");
        expect(onChange).toHaveBeenCalledWith({role_type: undefined});
    });

    it("calls onChange with is_suspended true when Suspended is selected", async () => {
        renderBar();
        const [, statusSelect] = screen.getAllByTestId("mocked-select");
        await userEvent.selectOptions(statusSelect, "suspended");
        expect(onChange).toHaveBeenCalledWith({is_suspended: true});
    });

    it("calls onChange with is_suspended false when Active is selected", async () => {
        renderBar();
        const [, statusSelect] = screen.getAllByTestId("mocked-select");
        await userEvent.selectOptions(statusSelect, "active");
        expect(onChange).toHaveBeenCalledWith({is_suspended: false});
    });

    it("clears all filters when Clear filters is clicked", async () => {
        renderBar({search: "john", role_type: "worker", is_suspended: true});
        await userEvent.click(screen.getByRole("button", {name: "Clear filters"}));
        expect(onChange).toHaveBeenCalledWith({search: undefined, role_type: undefined, is_suspended: undefined});
    });
});
