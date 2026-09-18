import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {RatingBreakdownChart} from "@/features/review";

describe("RatingBreakdownChart", () => {
    it("renders a role=img bar per star with a descriptive aria-label", () => {
        render(<RatingBreakdownChart breakdown={{5: 6, 4: 2, 3: 1, 2: 1, 1: 0}} totalCount={10}/>);

        expect(screen.getByRole("img", {name: "5 stars: 60% (6 reviews)"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "4 stars: 20% (2 reviews)"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "3 stars: 10% (1 review)"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "2 stars: 10% (1 review)"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "1 star: 0% (0 reviews)"})).toBeInTheDocument();
    });

    it("renders 0% bars when there are no reviews at all", () => {
        render(<RatingBreakdownChart breakdown={{5: 0, 4: 0, 3: 0, 2: 0, 1: 0}} totalCount={0}/>);
        expect(screen.getByRole("img", {name: "5 stars: 0% (0 reviews)"})).toBeInTheDocument();
    });

    it("renders bars in descending star order", () => {
        render(<RatingBreakdownChart breakdown={{5: 1, 4: 1, 3: 1, 2: 1, 1: 1}} totalCount={5}/>);
        const bars = screen.getAllByRole("img");
        expect(bars.map((bar) => bar.getAttribute("aria-label")?.[0])).toEqual(["5", "4", "3", "2", "1"]);
    });
});
