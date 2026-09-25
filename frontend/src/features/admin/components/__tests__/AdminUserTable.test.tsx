import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {AdminUserTable} from "../AdminUserTable";

const mockUsers = [
    {id: 1, name: "Alice", email: "alice@example.com", role_type: "worker", is_suspended: false},
    {id: 2, name: "Bob", email: "bob@example.com", role_type: "customer", is_suspended: true},
] as any;

describe("AdminUserTable", () => {
    it("renders a row per user", () => {
        render(<AdminUserTable users={mockUsers}/>, {wrapper: MemoryRouter});
        expect(screen.getAllByTestId("admin-user-row")).toHaveLength(2);
    });

    it("shows each user's name and email", () => {
        render(<AdminUserTable users={mockUsers}/>, {wrapper: MemoryRouter});
        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("alice@example.com")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("shows a status badge reflecting suspension", () => {
        render(<AdminUserTable users={mockUsers}/>, {wrapper: MemoryRouter});
        expect(screen.getByText("Active")).toBeInTheDocument();
        expect(screen.getByText("Suspended")).toBeInTheDocument();
    });

    it("links each row to its detail page", () => {
        render(<AdminUserTable users={mockUsers}/>, {wrapper: MemoryRouter});
        const links = screen.getAllByRole("link", {name: "View"});
        expect(links[0]).toHaveAttribute("href", "/admin/users/1");
        expect(links[1]).toHaveAttribute("href", "/admin/users/2");
    });

    it("renders nothing but the header when there are no users", () => {
        render(<AdminUserTable users={[]}/>, {wrapper: MemoryRouter});
        expect(screen.queryAllByTestId("admin-user-row")).toHaveLength(0);
    });
});
