import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createMemoryRouter, RouterProvider} from "react-router-dom";

import {AdminLayout} from "../AdminLayout";
import {useUser} from "@/features/user";

vi.mock("@/features/user", () => ({
    useUser: vi.fn(),
}));

vi.mock("@/components/LogoutButton", () => ({
    LogoutButton: () => <button type="button">Logout</button>,
}));

vi.mock("@/features/notification", () => ({
    NotificationBell: () => <div data-testid="notification-bell"/>,
}));

vi.mock("@/features/i18n", () => ({
    LanguageSwitcher: () => <div data-testid="language-switcher"/>,
}));

const renderAt = (path: string) => {
    const router = createMemoryRouter(
        [
            {
                path: "/admin",
                element: <AdminLayout/>,
                children: [
                    {path: "users", element: <div>Users content</div>},
                    {path: "users/:userId", element: <div>User detail content</div>},
                    {path: "worker-verifications", element: <div>Verifications content</div>},
                    {path: "worker-billing", element: <div>Billing content</div>},
                    {path: "analytics", element: <div>Analytics content</div>},
                    {path: "account", element: <div>Account content</div>},
                ],
            },
        ],
        {initialEntries: [path]},
    );
    render(<RouterProvider router={router}/>);
    return router;
};

// The layout renders the same nav twice (desktop sidebar + mobile strip,
// toggled by CSS breakpoints jsdom doesn't apply) -- scope to the first.
const sidebarNav = () => screen.getAllByRole("navigation", {name: "Admin panel"})[0];

describe("AdminLayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUser).mockReturnValue({data: {name: "Jane Admin", is_superuser: true}} as any);
    });

    it("renders the admin identity instead of a customer/worker role", () => {
        renderAt("/admin/users");

        expect(screen.getByTestId("admin-sidebar-header")).toHaveTextContent("Jane Admin");
        expect(screen.getByTestId("admin-sidebar-header")).toHaveTextContent("Administrator");
        expect(screen.queryByText("Customer")).not.toBeInTheDocument();
    });

    it("renders every admin section plus Account in the nav", () => {
        renderAt("/admin/users");

        const nav = within(sidebarNav());
        for (const label of ["Users", "Verification queue", "Commission dashboard", "Platform analytics", "Account"]) {
            expect(nav.getByRole("button", {name: label})).toBeInTheDocument();
        }
    });

    it("renders the matched child route through its Outlet", () => {
        renderAt("/admin/analytics");

        expect(screen.getByText("Analytics content")).toBeInTheDocument();
    });

    it("keeps the nav visible and navigates when a section is clicked", async () => {
        const router = renderAt("/admin/users");

        await userEvent.click(within(sidebarNav()).getByRole("button", {name: "Commission dashboard"}));

        expect(router.state.location.pathname).toBe("/admin/worker-billing");
        expect(screen.getByText("Billing content")).toBeInTheDocument();
        expect(within(sidebarNav()).getByRole("button", {name: "Users"})).toBeInTheDocument();
    });

    it("marks the current section, including on nested pages", () => {
        renderAt("/admin/users/42");

        const nav = within(sidebarNav());
        expect(nav.getByRole("button", {name: "Users"})).toHaveAttribute("aria-current", "page");
        expect(nav.getByRole("button", {name: "Account"})).not.toHaveAttribute("aria-current");
    });

    it("renders the language switcher, notification bell, and logout", () => {
        renderAt("/admin/users");

        expect(screen.getAllByTestId("language-switcher").length).toBeGreaterThan(0);
        expect(screen.getAllByTestId("notification-bell").length).toBeGreaterThan(0);
        expect(screen.getAllByRole("button", {name: "Logout"}).length).toBeGreaterThan(0);
    });
});
