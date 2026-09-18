import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {StarRating} from "@/features/review";

describe("StarRating", () => {
    it("renders 5 stars, each with its own aria-label", () => {
        render(<StarRating value={0} onChange={vi.fn()}/>);
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByRole("radio", {name: `${i} star${i > 1 ? "s" : ""}`})).toBeInTheDocument();
        }
    });

    it("calls onChange with the clicked star's value", async () => {
        const onChange = vi.fn();
        render(<StarRating value={0} onChange={onChange}/>);

        await userEvent.click(screen.getByRole("radio", {name: "3 stars"}));

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it("marks the selected star as checked", () => {
        render(<StarRating value={3} onChange={vi.fn()}/>);
        expect(screen.getByRole("radio", {name: "3 stars"})).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("radio", {name: "4 stars"})).toHaveAttribute("aria-checked", "false");
    });

    it("only the selected star is in the tab order", () => {
        render(<StarRating value={3} onChange={vi.fn()}/>);
        expect(screen.getByRole("radio", {name: "3 stars"})).toHaveAttribute("tabIndex", "0");
        expect(screen.getByRole("radio", {name: "1 star"})).toHaveAttribute("tabIndex", "-1");
    });

    it("ArrowRight increases the rating from the currently focused star", async () => {
        const onChange = vi.fn();
        render(<StarRating value={2} onChange={onChange}/>);

        screen.getByRole("radio", {name: "2 stars"}).focus();
        await userEvent.keyboard("{ArrowRight}");

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it("ArrowLeft decreases the rating from the currently focused star", async () => {
        const onChange = vi.fn();
        render(<StarRating value={2} onChange={onChange}/>);

        screen.getByRole("radio", {name: "2 stars"}).focus();
        await userEvent.keyboard("{ArrowLeft}");

        expect(onChange).toHaveBeenCalledWith(1);
    });

    it("does not go above 5 or below 1", async () => {
        const onChange = vi.fn();
        const {rerender} = render(<StarRating value={5} onChange={onChange}/>);
        screen.getByRole("radio", {name: "5 stars"}).focus();
        await userEvent.keyboard("{ArrowRight}");
        expect(onChange).toHaveBeenCalledWith(5);

        onChange.mockClear();
        rerender(<StarRating value={1} onChange={onChange}/>);
        screen.getByRole("radio", {name: "1 star"}).focus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it("disables all stars when disabled", () => {
        render(<StarRating value={0} onChange={vi.fn()} disabled/>);
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByRole("radio", {name: `${i} star${i > 1 ? "s" : ""}`})).toBeDisabled();
        }
    });
});
