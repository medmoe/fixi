import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {AdminWorkerVerificationsPage} from "../AdminWorkerVerificationsPage";
import {WorkerVerificationRow} from "../../components/WorkerVerificationRow";
import {useWorkerVerificationQueue} from "../../hooks/useWorkerVerificationQueue";
import {useApproveVerification} from "../../hooks/useApproveVerification";
import {useRejectVerification} from "../../hooks/useRejectVerification";
import {useVerificationDocumentUrl} from "../../hooks/useVerificationDocumentUrl";

vi.mock("../../hooks/useWorkerVerificationQueue", () => ({useWorkerVerificationQueue: vi.fn()}));
vi.mock("../../hooks/useApproveVerification", () => ({useApproveVerification: vi.fn()}));
vi.mock("../../hooks/useRejectVerification", () => ({useRejectVerification: vi.fn()}));
vi.mock("../../hooks/useVerificationDocumentUrl", () => ({useVerificationDocumentUrl: vi.fn()}));

vi.mock("../../components/WorkerVerificationRow", () => ({
    WorkerVerificationRow: vi.fn(({entry, onApprove}: any) => (
        <div data-testid="verification-row">
            <span>{entry.name}</span>
            <button type="button" onClick={() => onApprove(entry.id)}>Approve {entry.name}</button>
        </div>
    )),
}));

const mockUseQueue = vi.mocked(useWorkerVerificationQueue);
const mockUseApprove = vi.mocked(useApproveVerification);
const mockUseReject = vi.mocked(useRejectVerification);
const mockUseDocumentUrl = vi.mocked(useVerificationDocumentUrl);

const mockQueue = [
    {id: 1, user_id: 1, name: "Ali", email: "ali@example.com", bio: null, years_of_experience: null},
    {id: 2, user_id: 2, name: "Bob", email: "bob@example.com", bio: null, years_of_experience: null},
];

describe("AdminWorkerVerificationsPage", () => {
    const mockApprove = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseQueue.mockReturnValue({data: [], isLoading: false, isError: false} as any);
        mockUseApprove.mockReturnValue({mutate: mockApprove, isPending: false, variables: undefined} as any);
        mockUseReject.mockReturnValue({mutate: vi.fn(), isPending: false, variables: undefined} as any);
        mockUseDocumentUrl.mockReturnValue({mutate: vi.fn(), isPending: false, variables: undefined} as any);
    });

    it("shows a loading message while loading", () => {
        mockUseQueue.mockReturnValue({data: undefined, isLoading: true, isError: false} as any);
        render(<AdminWorkerVerificationsPage/>);
        expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    });

    it("shows an error message when the query fails", () => {
        mockUseQueue.mockReturnValue({data: undefined, isLoading: false, isError: true} as any);
        render(<AdminWorkerVerificationsPage/>);
        expect(screen.getByText("Something went wrong loading the verification queue. Please try again.")).toBeInTheDocument();
    });

    it("shows the empty state when the queue is empty", () => {
        render(<AdminWorkerVerificationsPage/>);
        expect(screen.getByText("No workers are waiting on CNI review.")).toBeInTheDocument();
    });

    it("shows the pending count", () => {
        mockUseQueue.mockReturnValue({data: mockQueue, isLoading: false, isError: false} as any);
        render(<AdminWorkerVerificationsPage/>);
        expect(screen.getByText("2 workers awaiting review")).toBeInTheDocument();
    });

    it("renders a row per queue entry", () => {
        mockUseQueue.mockReturnValue({data: mockQueue, isLoading: false, isError: false} as any);
        render(<AdminWorkerVerificationsPage/>);
        expect(screen.getAllByTestId("verification-row")).toHaveLength(2);
        expect(screen.getByText("Ali")).toBeInTheDocument();
        expect(screen.getByText("Bob")).toBeInTheDocument();
    });

    it("calls the approve mutation with the entry id", async () => {
        const user = userEvent.setup();
        mockUseQueue.mockReturnValue({data: mockQueue, isLoading: false, isError: false} as any);
        render(<AdminWorkerVerificationsPage/>);

        await user.click(screen.getByRole("button", {name: "Approve Ali"}));

        expect(mockApprove).toHaveBeenCalledWith(1);
    });

    it("only marks the matching row as approving", () => {
        mockUseQueue.mockReturnValue({data: mockQueue, isLoading: false, isError: false} as any);
        mockUseApprove.mockReturnValue({mutate: mockApprove, isPending: true, variables: 1} as any);

        render(<AdminWorkerVerificationsPage/>);

        const calls = vi.mocked(WorkerVerificationRow).mock.calls;
        const aliCall = calls.find(([props]) => props.entry.id === 1)?.[0];
        const bobCall = calls.find(([props]) => props.entry.id === 2)?.[0];

        expect(aliCall?.isApproving).toBe(true);
        expect(bobCall?.isApproving).toBe(false);
    });
});
