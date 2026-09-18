import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {ReviewListItem} from "@/features/review";
import type {ReviewPublicRead} from "@/features/review";

const baseReview: ReviewPublicRead = {
    id: 1,
    rating: 4,
    comment: "Great work, on time.",
    reviewer_display_name: "Kristin G.",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
};

describe("ReviewListItem", () => {
    it("renders the reviewer display name and a relative date", () => {
        render(<ReviewListItem review={baseReview}/>);
        expect(screen.getByText("Kristin G.")).toBeInTheDocument();
        expect(screen.getByText("3 days ago")).toBeInTheDocument();
    });

    it("renders the comment", () => {
        render(<ReviewListItem review={baseReview}/>);
        expect(screen.getByText("Great work, on time.")).toBeInTheDocument();
    });

    it("does not render a comment paragraph when there is none", () => {
        render(<ReviewListItem review={{...baseReview, comment: null}}/>);
        expect(screen.queryByText("Great work, on time.")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", {name: /show more/i})).not.toBeInTheDocument();
    });

    it("does not show a 'Show more' toggle for a short comment", () => {
        render(<ReviewListItem review={baseReview}/>);
        expect(screen.queryByRole("button", {name: /show more/i})).not.toBeInTheDocument();
    });

    it("shows a 'Show more' toggle for a long comment, and expands on click", async () => {
        const longComment = "a".repeat(250);
        render(<ReviewListItem review={{...baseReview, comment: longComment}}/>);

        const toggle = screen.getByRole("button", {name: /show more/i});
        expect(toggle).toBeInTheDocument();

        await act(async () => {
            await userEvent.click(toggle);
        });

        expect(screen.getByRole("button", {name: /show less/i})).toBeInTheDocument();
    });
});
