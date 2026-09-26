import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {AdminFlaggedReviewsPage} from "../AdminFlaggedReviewsPage";
import {useFlaggedReviews} from "../../hooks/useFlaggedReviews";
import {useKeepFlaggedReview} from "../../hooks/useKeepFlaggedReview";
import {useRemoveFlaggedReview} from "../../hooks/useRemoveFlaggedReview";

vi.mock("../../hooks/useFlaggedReviews", () => ({useFlaggedReviews: vi.fn()}));
vi.mock("../../hooks/useKeepFlaggedReview", () => ({useKeepFlaggedReview: vi.fn()}));
vi.mock("../../hooks/useRemoveFlaggedReview", () => ({useRemoveFlaggedReview: vi.fn()}));

vi.mock("../../components/FlaggedReviewRow", () => ({
    FlaggedReviewRow: vi.fn(({review, onKeep, onRemove, isKeeping, isRemoving}: any) => (
        <div data-testid="flagged-row">
            <span>{review.comment}</span>
            <button type="button" onClick={() => onKeep(review.id)}>Keep {review.id}</button>
            <button type="button" onClick={() => onRemove(review.id)}>Remove {review.id}</button>
            {isKeeping && <span>keeping {review.id}</span>}
            {isRemoving && <span>removing {review.id}</span>}
        </div>
    )),
}));

const mockReviews = [
    {id: 1, rating: 1, comment: "First", reviewer_name: "A", reviewee_name: "B", report_count: 1, created_at: "2026-09-01T10:00:00Z"},
    {id: 2, rating: 2, comment: "Second", reviewer_name: "C", reviewee_name: "D", report_count: 4, created_at: "2026-09-02T10:00:00Z"},
];

describe("AdminFlaggedReviewsPage", () => {
    const keep = vi.fn();
    const remove = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useFlaggedReviews).mockReturnValue({data: [], isLoading: false, isError: false} as any);
        vi.mocked(useKeepFlaggedReview).mockReturnValue({mutate: keep, isPending: false, variables: undefined} as any);
        vi.mocked(useRemoveFlaggedReview).mockReturnValue({mutate: remove, isPending: false, variables: undefined} as any);
    });

    it("shows a loading message while loading", () => {
        vi.mocked(useFlaggedReviews).mockReturnValue({data: undefined, isLoading: true, isError: false} as any);
        render(<AdminFlaggedReviewsPage/>);
        expect(screen.getAllByText("Loading...").length).toBeGreaterThan(0);
    });

    it("shows an error message when the query fails", () => {
        vi.mocked(useFlaggedReviews).mockReturnValue({data: undefined, isLoading: false, isError: true} as any);
        render(<AdminFlaggedReviewsPage/>);
        expect(screen.getByText("Something went wrong loading flagged reviews. Please try again.")).toBeInTheDocument();
    });

    it("shows the empty state when nothing is flagged", () => {
        render(<AdminFlaggedReviewsPage/>);
        expect(screen.getByText("No reviews awaiting moderation.")).toBeInTheDocument();
    });

    it("renders a row per flagged review with a count", () => {
        vi.mocked(useFlaggedReviews).mockReturnValue({data: mockReviews, isLoading: false, isError: false} as any);
        render(<AdminFlaggedReviewsPage/>);

        expect(screen.getAllByTestId("flagged-row")).toHaveLength(2);
        expect(screen.getByText("2 reviews awaiting moderation")).toBeInTheDocument();
    });

    it("wires keep and remove to their mutations", async () => {
        vi.mocked(useFlaggedReviews).mockReturnValue({data: mockReviews, isLoading: false, isError: false} as any);
        render(<AdminFlaggedReviewsPage/>);

        await userEvent.click(screen.getByRole("button", {name: "Keep 1"}));
        await userEvent.click(screen.getByRole("button", {name: "Remove 2"}));

        expect(keep).toHaveBeenCalledWith(1);
        expect(remove).toHaveBeenCalledWith(2);
    });

    it("marks only the row whose mutation is pending as busy", () => {
        vi.mocked(useFlaggedReviews).mockReturnValue({data: mockReviews, isLoading: false, isError: false} as any);
        vi.mocked(useRemoveFlaggedReview).mockReturnValue({mutate: remove, isPending: true, variables: 2} as any);
        render(<AdminFlaggedReviewsPage/>);

        expect(screen.getByText("removing 2")).toBeInTheDocument();
        expect(screen.queryByText("removing 1")).not.toBeInTheDocument();
    });
});
