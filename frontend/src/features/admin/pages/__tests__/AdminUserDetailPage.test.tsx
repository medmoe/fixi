import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router-dom";

import {AdminUserDetailPage} from "../AdminUserDetailPage";
import {useAdminUserDetail} from "../../hooks/useAdminUserDetail";
import {useSuspendUser} from "../../hooks/useSuspendUser";
import {useReactivateUser} from "../../hooks/useReactivateUser";
import {usePermanentlyDeleteUser} from "../../hooks/usePermanentlyDeleteUser";

vi.mock("react-router-dom", async (importOriginal) => {
    const actual = await importOriginal<typeof import("react-router-dom")>();
    return {
        ...actual,
        useParams: () => ({userId: "1"}),
    };
});

vi.mock("../../hooks/useAdminUserDetail", () => ({useAdminUserDetail: vi.fn()}));
vi.mock("../../hooks/useSuspendUser", () => ({useSuspendUser: vi.fn()}));
vi.mock("../../hooks/useReactivateUser", () => ({useReactivateUser: vi.fn()}));
vi.mock("../../hooks/usePermanentlyDeleteUser", () => ({usePermanentlyDeleteUser: vi.fn()}));
vi.mock("../../components/PermanentDeleteUserDialog", () => ({
    PermanentDeleteUserDialog: vi.fn(({username, onConfirm}: any) => (
        <button type="button" onClick={() => onConfirm("GDPR #1")}>Delete {username}</button>
    )),
}));

vi.mock("../../components/UserStatusBadge", () => ({
    UserStatusBadge: vi.fn(({isSuspended}: any) => <span data-testid="status-badge">{isSuspended ? "Suspended" : "Active"}</span>),
}));

vi.mock("../../components/SuspendUserDialog", () => ({
    SuspendUserDialog: vi.fn(({mode, onConfirm}: any) => (
        <button type="button" onClick={() => onConfirm("test reason")}>
            {mode === "suspend" ? "Suspend account" : "Reactivate account"}
        </button>
    )),
}));

vi.mock("../../components/AdminAuditLogList", () => ({
    AdminAuditLogList: vi.fn(({entries}: any) => <div data-testid="audit-log">{entries.length} entries</div>),
}));

vi.mock("lucide-react", () => ({
    Loader2: vi.fn(() => <span data-testid="loader-icon"/>),
    AlertCircle: vi.fn(() => <span data-testid="alert-icon"/>),
    ArrowLeft: vi.fn(() => <span data-testid="arrow-icon"/>),
}));

const mockUseAdminUserDetail = vi.mocked(useAdminUserDetail);
const mockUseSuspendUser = vi.mocked(useSuspendUser);
const mockUseReactivateUser = vi.mocked(useReactivateUser);

const mockUser = {
    id: 1,
    name: "John Doe",
    username: "john_doe",
    email: "john@example.com",
    role_type: "worker",
    is_suspended: false,
} as any;

const renderPage = () => render(<AdminUserDetailPage/>, {wrapper: MemoryRouter});

describe("AdminUserDetailPage", () => {
    const mockDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseSuspendUser.mockReturnValue({mutate: vi.fn(), isPending: false} as any);
        mockUseReactivateUser.mockReturnValue({mutate: vi.fn(), isPending: false} as any);
        vi.mocked(usePermanentlyDeleteUser).mockReturnValue({mutate: mockDelete, isPending: false} as any);
    });

    it("shows a loading state", () => {
        mockUseAdminUserDetail.mockReturnValue({user: undefined, isLoading: true, error: null, auditLog: []} as any);
        renderPage();
        expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });

    it("shows an error state when the fetch fails", () => {
        mockUseAdminUserDetail.mockReturnValue({user: undefined, isLoading: false, error: new Error("failed"), auditLog: []} as any);
        renderPage();
        expect(screen.getByTestId("alert-icon")).toBeInTheDocument();
    });

    it("renders the user's details", () => {
        mockUseAdminUserDetail.mockReturnValue({user: mockUser, isLoading: false, error: null, auditLog: []} as any);
        renderPage();
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("john_doe")).toBeInTheDocument();
        expect(screen.getByText("john@example.com")).toBeInTheDocument();
    });

    it("shows the suspend button for an active user", () => {
        mockUseAdminUserDetail.mockReturnValue({user: mockUser, isLoading: false, error: null, auditLog: []} as any);
        renderPage();
        expect(screen.getByText("Suspend account")).toBeInTheDocument();
    });

    it("shows the reactivate button for a suspended user", () => {
        mockUseAdminUserDetail.mockReturnValue({user: {...mockUser, is_suspended: true}, isLoading: false, error: null, auditLog: []} as any);
        renderPage();
        expect(screen.getByText("Reactivate account")).toBeInTheDocument();
    });

    it("calls the suspend mutation with the reason when confirmed", async () => {
        const mutate = vi.fn();
        mockUseAdminUserDetail.mockReturnValue({user: mockUser, isLoading: false, error: null, auditLog: []} as any);
        mockUseSuspendUser.mockReturnValue({mutate, isPending: false} as any);

        renderPage();
        screen.getByText("Suspend account").click();

        expect(mutate).toHaveBeenCalledWith("test reason");
    });

    it("renders the audit log", () => {
        mockUseAdminUserDetail.mockReturnValue({
            user: mockUser, isLoading: false, error: null,
            auditLog: [{id: 1}, {id: 2}],
        } as any);
        renderPage();
        expect(screen.getByTestId("audit-log")).toHaveTextContent("2 entries");
    });

    it("offers permanent deletion in a danger zone and wires it to the mutation", async () => {
        mockUseAdminUserDetail.mockReturnValue({user: mockUser, isLoading: false, error: null, auditLog: []} as any);
        renderPage();

        expect(screen.getByText("Danger zone")).toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", {name: "Delete john_doe"}));
        expect(mockDelete).toHaveBeenCalledWith("GDPR #1");
    });

    it("does not offer permanent deletion for admin accounts", () => {
        mockUseAdminUserDetail.mockReturnValue({user: {...mockUser, is_superuser: true}, isLoading: false, error: null, auditLog: []} as any);
        renderPage();

        expect(screen.queryByText("Danger zone")).not.toBeInTheDocument();
    });
});
