import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import {AnalyticsOverviewCards} from "../AnalyticsOverviewCards";
import type {PlatformOverviewRead} from "../../types/analytics.types";

const overview: PlatformOverviewRead = {
    jobs_posted: 10,
    applications_submitted: 20,
    applications_accepted: 5,
    jobs_completed: 3,
    acceptance_rate: 0.25,
    completion_rate: 0.3,
    daily: [],
};

describe("AnalyticsOverviewCards", () => {
    it("shows jobs posted and applications submitted", () => {
        render(<AnalyticsOverviewCards overview={overview}/>);
        expect(screen.getByText("10")).toBeInTheDocument();
        expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("shows acceptance and completion rates as rounded percentages", () => {
        render(<AnalyticsOverviewCards overview={overview}/>);
        expect(screen.getByText("25%")).toBeInTheDocument();
        expect(screen.getByText("30%")).toBeInTheDocument();
    });
});
