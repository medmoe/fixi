import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ApplyToJobDialog, useApplyToJob} from "@/features/job";

vi.mock("../../hooks/useApplyToJob");

const mutateMock = vi.fn();

const createWrapper = () => {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}}});
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe("ApplyToJobDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useApplyToJob).mockReturnValue({
            mutate: mutateMock,
            isPending: false,
        } as never);
    });

    it("renders the apply trigger button", () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        expect(screen.getByRole("button", {name: /apply to this job/i})).toBeInTheDocument();
    });

    it("disables the trigger when disabled prop is true", () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink" disabled/>, {wrapper: createWrapper()});
        expect(screen.getByRole("button", {name: /apply to this job/i})).toBeDisabled();
    });

    it("opens the dialog on click", async () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });
        // The title uses &ldquo;/&rdquo; HTML entities which render as curly quotes.
        expect(screen.getByText(/apply to “fix sink”/i)).toBeInTheDocument();
    });

    it("calls mutate with the typed message on submit", async () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });
        await act(async () => {
            await userEvent.type(screen.getByLabelText("Application message"), "I can start today");
        });
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /submit application/i}));
        });
        expect(mutateMock).toHaveBeenCalledWith(
            {message: "I can start today"},
            expect.objectContaining({onSuccess: expect.any(Function)})
        );
    });

    it("submits with undefined message when left empty", async () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /submit application/i}));
        });
        expect(mutateMock).toHaveBeenCalledWith(
            {message: undefined},
            expect.objectContaining({onSuccess: expect.any(Function)})
        );
    });

    it("shows submitted state after a successful application", async () => {
        mutateMock.mockImplementation((_payload, options) => {
            options?.onSuccess?.();
        });

        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /submit application/i}));
        });

        await waitFor(() => {
            expect(screen.getByRole("button", {name: /application submitted/i})).toBeDisabled();
        });
    });

    it("shows a pending state while submitting", async () => {
        vi.mocked(useApplyToJob).mockReturnValue({
            mutate: mutateMock,
            isPending: true,
        } as never);

        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });

        expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    it("closes the dialog on cancel without submitting", async () => {
        render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
        });
        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /cancel/i}));
        });
        expect(mutateMock).not.toHaveBeenCalled();
    });

    describe("already-applied error handling", () => {
        it("shows submitted state when the backend reports a duplicate application", async () => {
            mutateMock.mockImplementation((_payload, options) => {
                options?.onError?.({
                    response: {data: {detail: "You have already applied to this job"}},
                } as never);
            });

            render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole("button", {name: /submit application/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole("button", {name: /application submitted/i})).toBeDisabled();
            });
        });

        it("does not switch to submitted state for a non-duplicate error", async () => {
            mutateMock.mockImplementation((_payload, options) => {
                options?.onError?.({
                    response: {data: {detail: "Cannot apply to a job that is not OPEN. Current status: closed"}},
                } as never);
            });

            render(<ApplyToJobDialog jobId={1} jobTitle="Fix sink"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole("button", {name: /apply to this job/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole("button", {name: /submit application/i}));
            });

            expect(screen.queryByRole("button", {name: /application submitted/i})).not.toBeInTheDocument();
            expect(screen.getByRole("button", {name: /submit application/i})).toBeInTheDocument();
        });
    });
});