import {describe, expect, it} from "vitest";
import {render} from "@testing-library/react";
import {RatingStars} from "@/features/review";

// The container is aria-hidden (the adjacent numeric label carries the
// accessible info), so these assert on structure rather than roles: a
// direct filled <svg> child is a full star, a wrapping span is a half
// star, and a plain unfilled <svg> is an empty star.
const countStars = (container: HTMLElement) => {
    const row = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    const children = Array.from(row.children);
    const full = children.filter((el) => el.tagName === "svg" && el.classList.contains("fill-yellow-400")).length;
    const half = children.filter((el) => el.tagName === "SPAN").length;
    const empty = children.filter((el) => el.tagName === "svg" && !el.classList.contains("fill-yellow-400")).length;
    return {full, half, empty};
};

describe("RatingStars", () => {
    it("renders 5 full stars for a perfect rating", () => {
        const {container} = render(<RatingStars rating={5}/>);
        expect(countStars(container)).toEqual({full: 5, half: 0, empty: 0});
    });

    it("renders 0 stars filled for a zero rating", () => {
        const {container} = render(<RatingStars rating={0}/>);
        expect(countStars(container)).toEqual({full: 0, half: 0, empty: 5});
    });

    it("rounds 4.7 to a 4.5-star visual (4 full, 1 half, 0 empty)", () => {
        const {container} = render(<RatingStars rating={4.7}/>);
        expect(countStars(container)).toEqual({full: 4, half: 1, empty: 0});
    });

    it("rounds 3.2 down to 3.0 stars (no half star)", () => {
        const {container} = render(<RatingStars rating={3.2}/>);
        expect(countStars(container)).toEqual({full: 3, half: 0, empty: 2});
    });

    it("rounds 3.3 up to a 3.5-star visual", () => {
        const {container} = render(<RatingStars rating={3.3}/>);
        expect(countStars(container)).toEqual({full: 3, half: 1, empty: 1});
    });
});
