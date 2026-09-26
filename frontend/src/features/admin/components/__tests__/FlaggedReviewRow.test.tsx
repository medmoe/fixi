import {beforeEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {FlaggedReviewRow} from "../FlaggedReviewRow";
import type {FlaggedReviewRead} from "../../types/flaggedReview.types";

const review: FlaggedReviewRead = {
    id: 5,
    rating: 1,
    comment: "Never showed up",
    reviewer_name: "Ali",
    reviewee_name: "Bob",
    report_count: 3,
    created_at: "2026-09-01T10:00:00Z",
};

describe("FlaggedReviewRow", () => {
    const onKeep = vi.fn();
    const onRemove = vi.fn();

    const renderRow = (overrides: Partial<React.ComponentProps<typeof FlaggedReviewRow>> = {}) =>
        render(<FlaggedReviewRow review={review} onKeep={onKeep} isKeeping={false} onRemove={onRemove} isRemoving={false} {...overrides}/>);

    beforeEach(() => vi.clearAllMocks());

    it("shows the comment, report count, rating and who reviewed whom", () => {
        renderRow();

        expect(screen.getByText("Never showed up")).toBeInTheDocument();
        expect(screen.getByText("3 reports")).toBeInTheDocument();
        expect(screen.getByText("Rated 1 out of 5")).toBeInTheDocument();
        expect(screen.getByText(/Ali → Bob/)).toBeInTheDocument();
    });

    it("shows a placeholder when the review has no comment", () => {
        renderRow({review: {...review, comment: null}});
        expect(screen.getByText("No comment")).toBeInTheDocument();
    });

    it("calls onKeep with the review id", async () => {
        renderRow();
        await userEvent.click(screen.getByRole("button", {name: "Keep"}));
        expect(onKeep).toHaveBeenCalledWith(5);
    });

    it("asks for confirmation before removing", async () => {
        renderRow();

        await userEvent.click(screen.getByRole("button", {name: "Remove"}));
        expect(onRemove).not.toHaveBeenCalled();
        expect(screen.getByText("Remove this review?")).toBeInTheDocument();

        const confirmButtons = screen.getAllByRole("button", {name: "Remove"});
        await userEvent.click(confirmButtons[confirmButtons.length - 1]);
        expect(onRemove).toHaveBeenCalledWith(5);
    });

    it("disables both actions while one is in flight", () => {
        renderRow({isKeeping: true});

        expect(screen.getByRole("button", {name: "Keep"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Remove"})).toBeDisabled();
    });
});
