import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {AdminUsersPage} from "../AdminUsersPage";
import {useAdminUsers} from "../../hooks/useAdminUsers";

vi.mock("../../hooks/useAdminUsers", () => ({
    useAdminUsers: vi.fn(),
}));

vi.mock("../../components/AdminUserFilterBar", () => ({
    AdminUserFilterBar: vi.fn(({onChange}: any) => (
        <div data-testid="filter-bar">
            <button type="button" onClick={() => onChange({search: "john"})}>
                Update filters
            </button>
        </div>
    )),
}));

vi.mock("../../components/AdminUserTable", () => ({
    AdminUserTable: vi.fn(({users}: any) => (
        <div data-testid="user-table">
            {users.map((u: any) => (
                <div key={u.id}>{u.name}</div>
            ))}
        </div>
    )),
}));

vi.mock("@/components/ui/button", () => ({
    Button: vi.fn(({children, onClick, disabled}: any) => (
        <button type="button" onClick={onClick} disabled={disabled}>
            {children}
        </button>
    )),
}));

vi.mock("lucide-react", () => ({
    Loader2: vi.fn(() => <span data-testid="loader-icon"/>),
}));

const mockUseAdminUsers = vi.mocked(useAdminUsers);

const mockUsers = [
    {id: 1, name: "User One"},
    {id: 2, name: "User Two"},
] as any;

const createState = (overrides: Partial<ReturnType<typeof useAdminUsers>> = {}): ReturnType<typeof useAdminUsers> => ({
    filters: {},
    updateFilters: vi.fn(),
    users: [],
    totalCount: 0,
    hasMore: false,
    loadMore: vi.fn(),
    isLoading: false,
    isFetchingNextPage: false,
    isError: false,
    ...overrides,
});

describe("AdminUsersPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseAdminUsers.mockReturnValue(createState());
    });

    it("renders the filter bar", () => {
        render(<AdminUsersPage/>);
        expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    });

    it("shows the user count", () => {
        mockUseAdminUsers.mockReturnValue(createState({users: mockUsers, totalCount: 2}));
        render(<AdminUsersPage/>);
        expect(screen.getByText("2 users found")).toBeInTheDocument();
    });

    it("shows a loading message while loading", () => {
        mockUseAdminUsers.mockReturnValue(createState({isLoading: true}));
        render(<AdminUsersPage/>);
        expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    });

    it("shows an error message when the query fails", () => {
        mockUseAdminUsers.mockReturnValue(createState({isError: true}));
        render(<AdminUsersPage/>);
        expect(screen.getByText("Something went wrong loading users. Please try again.")).toBeInTheDocument();
    });

    it("shows the empty state when no users are found", () => {
        render(<AdminUsersPage/>);
        expect(screen.getByText("No users match these filters.")).toBeInTheDocument();
    });

    it("renders the user table when users are present", () => {
        mockUseAdminUsers.mockReturnValue(createState({users: mockUsers, totalCount: 2}));
        render(<AdminUsersPage/>);
        expect(screen.getByTestId("user-table")).toBeInTheDocument();
        expect(screen.getByText("User One")).toBeInTheDocument();
        expect(screen.getByText("User Two")).toBeInTheDocument();
    });

    it("shows Load more when hasMore is true", () => {
        mockUseAdminUsers.mockReturnValue(createState({users: mockUsers, totalCount: 2, hasMore: true}));
        render(<AdminUsersPage/>);
        expect(screen.getByRole("button", {name: "Load more"})).toBeInTheDocument();
    });

    it("does not show Load more when hasMore is false", () => {
        mockUseAdminUsers.mockReturnValue(createState({users: mockUsers, totalCount: 2, hasMore: false}));
        render(<AdminUsersPage/>);
        expect(screen.queryByRole("button", {name: "Load more"})).not.toBeInTheDocument();
    });

    it("calls loadMore when Load more is clicked", async () => {
        const user = userEvent.setup();
        const loadMore = vi.fn();
        mockUseAdminUsers.mockReturnValue(createState({users: mockUsers, totalCount: 2, hasMore: true, loadMore}));

        render(<AdminUsersPage/>);
        await act(async () => await user.click(screen.getByRole("button", {name: "Load more"})));

        expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("calls updateFilters when the filter bar changes filters", async () => {
        const user = userEvent.setup();
        const updateFilters = vi.fn();
        mockUseAdminUsers.mockReturnValue(createState({updateFilters}));

        render(<AdminUsersPage/>);
        await act(async () => await user.click(screen.getByRole("button", {name: "Update filters"})));

        expect(updateFilters).toHaveBeenCalledWith({search: "john"});
    });
});
