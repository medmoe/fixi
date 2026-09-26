import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {ConversionFunnelChart} from "../ConversionFunnelChart";

describe("ConversionFunnelChart", () => {
    it("renders each stage with its label and count", () => {
        render(<ConversionFunnelChart funnel={{posted: 10, applied: 8, accepted: 5, completed: 3}}/>);

        expect(screen.getByText("Posted")).toBeInTheDocument();
        expect(screen.getByText("Applied")).toBeInTheDocument();
        expect(screen.getByText("Accepted")).toBeInTheDocument();
        expect(screen.getByText("Completed")).toBeInTheDocument();
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("8")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("shows each stage's percentage of the posted stage", () => {
        render(<ConversionFunnelChart funnel={{posted: 10, applied: 5, accepted: 0, completed: 0}}/>);
        expect(screen.getByRole("img", {name: "Applied: 5 (50%)"})).toBeInTheDocument();
    });

    it("does not divide by zero when posted is 0", () => {
        render(<ConversionFunnelChart funnel={{posted: 0, applied: 0, accepted: 0, completed: 0}}/>);
        expect(screen.getByRole("img", {name: "Posted: 0 (0%)"})).toBeInTheDocument();
    });
});
