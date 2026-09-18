import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {ReviewCard, useReviewStatus, useSubmitReview} from "@/features/review";

vi.mock("../../hooks/useReviewStatus");
vi.mock("../../hooks/useSubmitReview");

const mutateMock = vi.fn();

const mockEligible = () => {
    vi.mocked(useReviewStatus).mockReturnValue({
        data: {can_review: true, reason: null},
        isLoading: false,
    } as never);
};

const selectRating = async (stars: number) => {
    await act(async () => {
        await userEvent.click(screen.getByRole("radio", {name: `${stars} star${stars > 1 ? "s" : ""}`}));
    });
};

const clickSubmit = async () => {
    await act(async () => {
        await userEvent.click(screen.getByRole("button", {name: /submit review/i}));
    });
};

describe("ReviewCard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useSubmitReview).mockReturnValue({mutate: mutateMock} as never);
    });

    it("renders nothing while eligibility is loading", () => {
        vi.mocked(useReviewStatus).mockReturnValue({data: undefined, isLoading: true} as never);
        const {container} = render(<ReviewCard jobId={1}/>);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when can_review is false", () => {
        vi.mocked(useReviewStatus).mockReturnValue({
            data: {can_review: false, reason: "already_submitted"},
            isLoading: false,
        } as never);
        const {container} = render(<ReviewCard jobId={1}/>);
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the form when eligible", () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);
        expect(screen.getByText("Leave a review")).toBeInTheDocument();
        expect(screen.getByRole("radiogroup", {name: "Rating"})).toBeInTheDocument();
        expect(screen.getByLabelText("Review comment")).toBeInTheDocument();
    });

    it("disables the submit button until a star is selected", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        expect(screen.getByRole("button", {name: /submit review/i})).toBeDisabled();

        await selectRating(4);

        expect(screen.getByRole("button", {name: /submit review/i})).toBeEnabled();
    });

    it("shows a live character counter for the comment", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        expect(screen.getByText("0/1000")).toBeInTheDocument();
        await act(async () => {
            await userEvent.type(screen.getByLabelText("Review comment"), "Great work");
        });
        expect(screen.getByText("10/1000")).toBeInTheDocument();
    });

    it("collapses to the confirmation state immediately on submit (optimistic UI)", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        await selectRating(5);
        await clickSubmit();

        expect(screen.getByText(/review submitted/i)).toBeInTheDocument();
        expect(screen.queryByText("Leave a review")).not.toBeInTheDocument();
    });

    it("calls the mutation with the selected rating and trimmed comment", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        await selectRating(5);
        await act(async () => {
            await userEvent.type(screen.getByLabelText("Review comment"), "  Great work  ");
        });
        await clickSubmit();

        expect(mutateMock).toHaveBeenCalledWith(
            {rating: 5, comment: "Great work"},
            expect.objectContaining({onError: expect.any(Function)})
        );
    });

    it("submits with undefined comment when left empty", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        await selectRating(5);
        await clickSubmit();

        expect(mutateMock).toHaveBeenCalledWith(
            {rating: 5, comment: undefined},
            expect.objectContaining({onError: expect.any(Function)})
        );
    });

    it("reverts to the form and shows an inline error on API failure", async () => {
        mockEligible();
        mutateMock.mockImplementation((_payload, options) => {
            options?.onError?.({response: {data: {detail: "Job is not eligible for review"}}});
        });

        render(<ReviewCard jobId={1}/>);
        await selectRating(5);
        await clickSubmit();

        expect(screen.getByText("Leave a review")).toBeInTheDocument();
        expect(screen.getByRole("alert")).toHaveTextContent("Job is not eligible for review");
    });

    it("dismiss button on the confirmation state hides the card", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        await selectRating(5);
        await clickSubmit();
        expect(screen.getByText(/review submitted/i)).toBeInTheDocument();

        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /dismiss/i}));
        });

        expect(screen.queryByText(/review submitted/i)).not.toBeInTheDocument();
    });

    it("dismiss button on the form hides the card entirely", async () => {
        mockEligible();
        render(<ReviewCard jobId={1}/>);

        await act(async () => {
            await userEvent.click(screen.getByRole("button", {name: /dismiss/i}));
        });

        expect(screen.queryByText("Leave a review")).not.toBeInTheDocument();
    });
});
