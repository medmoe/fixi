import {describe, expect, it} from "vitest";
import {filtersToSearchParams, searchParamsToFilters} from "../urlFilterSync.ts";

describe("filtersToSearchParams", () => {
    it("serializes number filters", () => {
        const params = filtersToSearchParams({ trade_category_id: 3, min_hourly_rate: 50 });
        expect(params.get("trade_category_id")).toBe("3");
        expect(params.get("min_hourly_rate")).toBe("50");
    });

    it("serializes boolean filters", () => {
        const params = filtersToSearchParams({ is_available: true, is_verified: false });
        expect(params.get("is_available")).toBe("true");
        expect(params.get("is_verified")).toBe("false");
    });

    it("omits undefined values", () => {
        const params = filtersToSearchParams({ trade_category_id: undefined });
        expect(params.has("trade_category_id")).toBe(false);
    });

    it("serializes sort_by", () => {
        const params = filtersToSearchParams({ sort_by: "hourly_rate" });
        expect(params.get("sort_by")).toBe("hourly_rate");
    });
});

describe("searchParamsToFilters", () => {
    it("parses number filters", () => {
        const params = new URLSearchParams("trade_category_id=3&min_hourly_rate=50");
        const filters = searchParamsToFilters(params);
        expect(filters.trade_category_id).toBe(3);
        expect(filters.min_hourly_rate).toBe(50);
    });

    it("parses boolean filters", () => {
        const params = new URLSearchParams("is_available=true&is_verified=false");
        const filters = searchParamsToFilters(params);
        expect(filters.is_available).toBe(true);
        expect(filters.is_verified).toBe(false);
    });

    it("ignores invalid number values", () => {
        const params = new URLSearchParams("trade_category_id=not-a-number");
        const filters = searchParamsToFilters(params);
        expect(filters.trade_category_id).toBeUndefined();
    });

    it("ignores invalid sort_by values", () => {
        const params = new URLSearchParams("sort_by=popularity");
        const filters = searchParamsToFilters(params);
        expect(filters.sort_by).toBeUndefined();
    });

    it("returns an empty object for an empty search string", () => {
        const filters = searchParamsToFilters(new URLSearchParams(""));
        expect(filters).toEqual({});
    });

    it("round-trips filters -> params -> filters", () => {
        const original = {
            trade_category_id: 2,
            is_verified: true,
            min_hourly_rate: 25,
            sort_by: "distance" as const,
        };
        const params = filtersToSearchParams(original);
        const roundTripped = searchParamsToFilters(params);
        expect(roundTripped).toEqual(original);
    });
});