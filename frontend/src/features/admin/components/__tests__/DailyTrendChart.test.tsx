import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {DailyTrendChart} from "../DailyTrendChart";

describe("DailyTrendChart", () => {
    it("shows the empty state when there is no data", () => {
        render(<DailyTrendChart daily={[]}/>);
        expect(screen.getByText("No activity in the last 30 days.")).toBeInTheDocument();
    });

    it("renders a bar per day", () => {
        render(
            <DailyTrendChart
                daily={[
                    {date: "2026-01-01", jobs_posted: 3, applications_submitted: 1, jobs_completed: 0},
                    {date: "2026-01-02", jobs_posted: 1, applications_submitted: 0, jobs_completed: 1},
                ]}
            />
        );
        expect(screen.getByRole("img", {name: "2026-01-01: 3 jobs posted"})).toBeInTheDocument();
        expect(screen.getByRole("img", {name: "2026-01-02: 1 jobs posted"})).toBeInTheDocument();
    });
});
