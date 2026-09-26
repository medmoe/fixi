import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {AnalyticsBreakdownList} from "../AnalyticsBreakdownList";

describe("AnalyticsBreakdownList", () => {
    it("shows the empty state when there are no rows", () => {
        render(<AnalyticsBreakdownList rows={[]} emptyLabel="No data for this range."/>);
        expect(screen.getByText("No data for this range.")).toBeInTheDocument();
    });

    it("renders a bar per row with its label and count", () => {
        render(
            <AnalyticsBreakdownList
                rows={[{label: "Algiers", count: 5}, {label: "Oran", count: 2}]}
                emptyLabel="No data for this range."
            />
        );
        expect(screen.getByText("Algiers")).toBeInTheDocument();
        expect(screen.getByText("5")).toBeInTheDocument();
        expect(screen.getByText("Oran")).toBeInTheDocument();
        expect(screen.getByText("2")).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "Algiers: 5"})).toBeInTheDocument();
    });
});
