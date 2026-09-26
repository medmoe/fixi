import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {AnalyticsFilterBar} from "../AnalyticsFilterBar";
import type {AnalyticsDateRangeFilters} from "../../types/analytics.types";

describe("AnalyticsFilterBar", () => {
    let onChange: (partial: Partial<AnalyticsDateRangeFilters>) => void;

    beforeEach(() => {
        onChange = vi.fn();
    });

    const renderBar = (filters: AnalyticsDateRangeFilters = {}) =>
        render(<AnalyticsFilterBar filters={filters} onChange={onChange}/>);

    it("calls onChange with an ISO date_from when the from date changes", () => {
        renderBar();
        fireEvent.change(screen.getByLabelText("Date from"), {target: {value: "2026-01-01"}});
        expect(onChange).toHaveBeenCalledWith({date_from: "2026-01-01T00:00:00Z"});
    });

    it("calls onChange with an ISO date_to when the to date changes", () => {
        renderBar();
        fireEvent.change(screen.getByLabelText("Date to"), {target: {value: "2026-01-31"}});
        expect(onChange).toHaveBeenCalledWith({date_to: "2026-01-31T23:59:59Z"});
    });

    it("clears both filters when Clear filters is clicked", async () => {
        renderBar({date_from: "2026-01-01T00:00:00Z", date_to: "2026-01-31T23:59:59Z"});
        await userEvent.click(screen.getByRole("button", {name: "Clear filters"}));
        expect(onChange).toHaveBeenCalledWith({date_from: undefined, date_to: undefined});
    });
});
