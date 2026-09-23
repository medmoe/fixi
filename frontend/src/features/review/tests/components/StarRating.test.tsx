import {afterEach, describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {act} from "react";
import {StarRating} from "@/features/review";

const focusStar = async (name: string) => {
    await act(async () => {
        screen.getByRole("radio", {name}).focus();
    });
};

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

        await act(async () => {
            await userEvent.click(screen.getByRole("radio", {name: "3 stars"}));
        });

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

        await focusStar("2 stars");
        await act(async () => {
            await userEvent.keyboard("{ArrowRight}");
        });

        expect(onChange).toHaveBeenCalledWith(3);
    });

    it("ArrowLeft decreases the rating from the currently focused star", async () => {
        const onChange = vi.fn();
        render(<StarRating value={2} onChange={onChange}/>);

        await focusStar("2 stars");
        await act(async () => {
            await userEvent.keyboard("{ArrowLeft}");
        });

        expect(onChange).toHaveBeenCalledWith(1);
    });

    it("does not go above 5 or below 1", async () => {
        const onChange = vi.fn();
        const {rerender} = render(<StarRating value={5} onChange={onChange}/>);

        await focusStar("5 stars");
        await act(async () => {
            await userEvent.keyboard("{ArrowRight}");
        });
        expect(onChange).toHaveBeenCalledWith(5);

        onChange.mockClear();
        await act(async () => {
            rerender(<StarRating value={1} onChange={onChange}/>);
        });
        await focusStar("1 star");
        await act(async () => {
            await userEvent.keyboard("{ArrowLeft}");
        });
        expect(onChange).toHaveBeenCalledWith(1);
    });

    it("disables all stars when disabled", () => {
        render(<StarRating value={0} onChange={vi.fn()} disabled/>);
        for (let i = 1; i <= 5; i++) {
            expect(screen.getByRole("radio", {name: `${i} star${i > 1 ? "s" : ""}`})).toBeDisabled();
        }
    });

    describe("RTL keyboard navigation", () => {
        afterEach(() => {
            document.documentElement.dir = ""
        })

        it("ArrowRight decreases the rating under RTL -- it points at a lower-valued star once the row is mirrored", async () => {
            document.documentElement.dir = "rtl"
            const onChange = vi.fn();
            render(<StarRating value={2} onChange={onChange}/>);

            await focusStar("2 stars");
            await act(async () => {
                await userEvent.keyboard("{ArrowRight}");
            });

            expect(onChange).toHaveBeenCalledWith(1);
        });

        it("ArrowLeft increases the rating under RTL", async () => {
            document.documentElement.dir = "rtl"
            const onChange = vi.fn();
            render(<StarRating value={2} onChange={onChange}/>);

            await focusStar("2 stars");
            await act(async () => {
                await userEvent.keyboard("{ArrowLeft}");
            });

            expect(onChange).toHaveBeenCalledWith(3);
        });

        it("ArrowUp still increases and ArrowDown still decreases under RTL -- vertical keys don't mirror", async () => {
            const onChange = vi.fn();
            document.documentElement.dir = "rtl"
            render(<StarRating value={2} onChange={onChange}/>);

            await focusStar("2 stars");
            await act(async () => {
                await userEvent.keyboard("{ArrowUp}");
            });
            expect(onChange).toHaveBeenCalledWith(3);

            // `value` is still 2 here -- onChange is a mock, it doesn't
            // feed back into the component's props, so this exercises
            // ArrowDown from the same starting point as ArrowUp above,
            // not a continuation from where it left off.
            onChange.mockClear();
            await act(async () => {
                await userEvent.keyboard("{ArrowDown}");
            });
            expect(onChange).toHaveBeenCalledWith(1);
        });
    });
});
