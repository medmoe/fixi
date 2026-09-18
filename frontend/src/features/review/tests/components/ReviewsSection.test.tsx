import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {MemoryRouter} from "react-router-dom";
import {ReviewsSection, useWorkerReviewEligibility, useWorkerReviews} from "@/features/review";
import {useAuth} from "@/features/auth";

vi.mock("../../hooks/useWorkerReviews");
vi.mock("../../hooks/useWorkerReviewEligibility");
vi.mock("@/features/auth", () => ({useAuth: vi.fn()}));

const loadMoreMock = vi.fn();

const makeReview = (id: number, overrides: Partial<Record<string, unknown>> = {}) => ({
    id,
    rating: 5,
    comment: null,
    reviewer_display_name: "Kristin G.",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
});

const mockReviewsState = (overrides: Partial<Record<string, unknown>> = {}) => {
    vi.mocked(useWorkerReviews).mockReturnValue({
        reviews: [makeReview(1)],
        meta: {average_rating: "4.50", review_count: 1, total_pages: 1, rating_breakdown: {5: 1, 4: 0, 3: 0, 2: 0, 1: 0}},
        isLoading: false,
        isError: false,
        hasMore: false,
        loadMore: loadMoreMock,
        isFetchingNextPage: false,
        ...overrides,
    } as never);
};

const renderSection = () => render(<ReviewsSection workerProfileId={7}/>, {wrapper: MemoryRouter});

describe("ReviewsSection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({isAuthenticated: false} as never);
        vi.mocked(useWorkerReviewEligibility).mockReturnValue({data: undefined} as never);
    });

    it("shows a loading state while reviews are loading", () => {
        mockReviewsState({isLoading: true, reviews: [], meta: undefined});
        renderSection();
        expect(screen.getByRole("status", {name: /loading reviews/i})).toBeInTheDocument();
    });

    it("shows an error message instead of the empty state when the fetch fails", () => {
        mockReviewsState({isError: true, reviews: [], meta: undefined});
        renderSection();
        expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load reviews/i);
        expect(screen.queryByText("No reviews yet")).not.toBeInTheDocument();
    });

    it("renders the aggregate rating and review count", () => {
        mockReviewsState();
        renderSection();
        expect(screen.getByText("4.5")).toBeInTheDocument();
        expect(screen.getByText("1 review")).toBeInTheDocument();
    });

    it("renders the rating breakdown chart when there are reviews", () => {
        mockReviewsState();
        renderSection();
        expect(screen.getByRole("img", {name: /5 stars: 100%/i})).toBeInTheDocument();
    });

    it("renders the empty state when there are no reviews", () => {
        mockReviewsState({
            reviews: [],
            meta: {average_rating: null, review_count: 0, total_pages: 0, rating_breakdown: {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}},
        });
        renderSection();
        expect(screen.getByText("No reviews yet")).toBeInTheDocument();
        expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("renders each review in the list", () => {
        mockReviewsState({reviews: [makeReview(1), makeReview(2)]});
        renderSection();
        expect(screen.getAllByText("Kristin G.")).toHaveLength(2);
    });

    it("shows the Load more button when hasMore is true, and calls loadMore on click", async () => {
        mockReviewsState({hasMore: true});
        renderSection();

        const button = screen.getByRole("button", {name: /load more/i});
        await act(async () => {
            await userEvent.click(button);
        });

        expect(loadMoreMock).toHaveBeenCalled();
    });

    it("does not show Load more when hasMore is false", () => {
        mockReviewsState({hasMore: false});
        renderSection();
        expect(screen.queryByRole("button", {name: /load more/i})).not.toBeInTheDocument();
    });

    it("does not show the CTA when unauthenticated", () => {
        mockReviewsState();
        vi.mocked(useAuth).mockReturnValue({isAuthenticated: false} as never);
        vi.mocked(useWorkerReviewEligibility).mockReturnValue({data: undefined} as never);
        renderSection();
        expect(screen.queryByText(/leave a review/i)).not.toBeInTheDocument();
    });

    it("does not show the CTA when authenticated but not eligible", () => {
        mockReviewsState();
        vi.mocked(useAuth).mockReturnValue({isAuthenticated: true} as never);
        vi.mocked(useWorkerReviewEligibility).mockReturnValue({data: {can_review: false, job_id: null}} as never);
        renderSection();
        expect(screen.queryByText(/leave a review/i)).not.toBeInTheDocument();
    });

    it("shows the CTA linking to the eligible job when authenticated and eligible", () => {
        mockReviewsState();
        vi.mocked(useAuth).mockReturnValue({isAuthenticated: true} as never);
        vi.mocked(useWorkerReviewEligibility).mockReturnValue({data: {can_review: true, job_id: 42}} as never);
        renderSection();

        expect(screen.getByText(/worked with this person\? leave a review/i)).toBeInTheDocument();
        expect(screen.getByRole("link", {name: /leave a review/i})).toHaveAttribute("href", "/jobs/42");
    });
});
