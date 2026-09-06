import {describe, expect, it} from "vitest";
import {filtersToSearchParams, searchParamsToFilters} from "../urlFilterSync";

describe("job filtersToSearchParams", () => {
    it("serializes all filter fields", () => {
        const params = filtersToSearchParams({
            status: "open",
            trade_category_id: 1,
            budget_min: 100,
            budget_max: 500,
            search: "sink",
        });
        expect(params.get("status")).toBe("open");
        expect(params.get("trade_category_id")).toBe("1");
        expect(params.get("budget_min")).toBe("100");
        expect(params.get("budget_max")).toBe("500");
        expect(params.get("search")).toBe("sink");
    });

    it("omits undefined values", () => {
        const params = filtersToSearchParams({status: undefined, search: "sink"});
        expect(params.has("status")).toBe(false);
        expect(params.get("search")).toBe("sink");
    });

    it("omits empty string values", () => {
        const params = filtersToSearchParams({search: ""});
        expect(params.has("search")).toBe(false);
    });
});

describe("job searchParamsToFilters", () => {
    it("parses all filter fields back correctly — regression test for the empty-loop bug", () => {
        const params = new URLSearchParams(
            "status=open&trade_category_id=1&budget_min=100&budget_max=500&search=sink"
        );
        const filters = searchParamsToFilters(params);
        expect(filters).toEqual({
            status: "open",
            trade_category_id: 1,
            budget_min: 100,
            budget_max: 500,
            search: "sink",
        });
    });

    it("does not coerce a numeric search term into a number", () => {
        const params = new URLSearchParams("search=2024");
        const filters = searchParamsToFilters(params);
        expect(filters.search).toBe("2024");
        expect(typeof filters.search).toBe("string");
    });

    it("returns an empty object for an empty search string", () => {
        const filters = searchParamsToFilters(new URLSearchParams(""));
        expect(filters).toEqual({});
    });

    it("ignores unknown params", () => {
        const params = new URLSearchParams("unknown_field=value&status=open");
        const filters = searchParamsToFilters(params);
        expect(filters).toEqual({status: "open"});
    });

    it("round-trips filters -> params -> filters", () => {
        const original = {status: "open" as const, trade_category_id: 2, search: "pipe"};
        const roundTripped = searchParamsToFilters(filtersToSearchParams(original));
        expect(roundTripped).toEqual(original);
    });
});