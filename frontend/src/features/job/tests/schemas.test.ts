import {describe, expect, it} from "vitest";
import {jobPostSchema} from "../schemas.ts";

describe("JobPostSchema", () => {

    const validPayload = {
        title: "Fix leaking kitchen sink",
        description: "Pipe burst under the cabinet",
        trade_category_id: 1,
        budget_min: 100,
        budget_max: 500,
        display_location: "New York, NY",
        latitude: 40.7128,
        longitude: -74.0060,
    };

    // ------------------------------------------------------------------ //
    //  Title                                                               //
    // ------------------------------------------------------------------ //

    describe("title", () => {
        it("accepts a valid title", () => {
            const result = jobPostSchema.safeParse(validPayload);
            expect(result.success).toBe(true);
        });

        it("rejects an empty title", () => {
            const result = jobPostSchema.safeParse({...validPayload, title: ""});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("title");
        });

        it("rejects a title exceeding 255 characters", () => {
            const result = jobPostSchema.safeParse({...validPayload, title: "a".repeat(256)});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("title");
        });

        it("accepts a title of exactly 255 characters", () => {
            const result = jobPostSchema.safeParse({...validPayload, title: "a".repeat(255)});
            expect(result.success).toBe(true);
        });

        it("accepts a title of exactly 1 character", () => {
            const result = jobPostSchema.safeParse({...validPayload, title: "a"});
            expect(result.success).toBe(true);
        });

        it("rejects missing title", () => {
            const {title, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("title");
        });
    });

    // ------------------------------------------------------------------ //
    //  Description                                                         //
    // ------------------------------------------------------------------ //

    describe("description", () => {
        it("accepts a valid description", () => {
            const result = jobPostSchema.safeParse({...validPayload, description: "Some description"});
            expect(result.success).toBe(true);
        });

        it("accepts missing description", () => {
            const {description, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });

        it("rejects a non-string description", () => {
            const result = jobPostSchema.safeParse({...validPayload, description: 123});
            expect(result.success).toBe(false);
        });
    });

    // ------------------------------------------------------------------ //
    //  Trade Category                                                      //
    // ------------------------------------------------------------------ //

    describe("trade_category_id", () => {
        it("accepts a valid trade_category_id", () => {
            const result = jobPostSchema.safeParse({...validPayload, trade_category_id: 5});
            expect(result.success).toBe(true);
        });

        it("accepts missing trade_category_id", () => {
            const {trade_category_id, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });

        it("rejects zero trade_category_id", () => {
            const result = jobPostSchema.safeParse({...validPayload, trade_category_id: 0});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("trade_category_id");
        });

        it("rejects negative trade_category_id", () => {
            const result = jobPostSchema.safeParse({...validPayload, trade_category_id: -1});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("trade_category_id");
        });

        it("rejects non-integer trade_category_id", () => {
            const result = jobPostSchema.safeParse({...validPayload, trade_category_id: "abc"});
            expect(result.success).toBe(false);
        });
    });

    // ------------------------------------------------------------------ //
    //  Budget                                                              //
    // ------------------------------------------------------------------ //

    describe("budget_min", () => {
        it("accepts a valid budget_min", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 50});
            expect(result.success).toBe(true);
        });

        it("accepts budget_min of zero", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 0});
            expect(result.success).toBe(true);
        });

        it("accepts missing budget_min", () => {
            const {budget_min, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });

        it("rejects negative budget_min", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: -1});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("budget_min");
        });
    });

    describe("budget_max", () => {
        it("accepts a valid budget_max", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_max: 1000});
            expect(result.success).toBe(true);
        });

        it("accepts budget_max of zero", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 0, budget_max: 0});
            expect(result.success).toBe(true);
        });

        it("accepts missing budget_max", () => {
            const {budget_max, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });

        it("rejects negative budget_max", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_max: -1});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("budget_max");
        });
    });

    describe("budget range cross-field validation", () => {
        it("accepts budget_max equal to budget_min", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 200, budget_max: 200});
            expect(result.success).toBe(true);
        });

        it("accepts budget_max greater than budget_min", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 100, budget_max: 500});
            expect(result.success).toBe(true);
        });

        it("rejects budget_max less than budget_min", () => {
            const result = jobPostSchema.safeParse({...validPayload, budget_min: 500, budget_max: 100});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("budget_max");
            expect(result.error?.issues[0].message).toMatch(/budget max/i);
        });

        it("accepts when only budget_min is provided", () => {
            const {budget_max, ...rest} = validPayload;
            const result = jobPostSchema.safeParse({...rest, budget_min: 500});
            expect(result.success).toBe(true);
        });

        it("accepts when only budget_max is provided", () => {
            const {budget_min, ...rest} = validPayload;
            const result = jobPostSchema.safeParse({...rest, budget_max: 500});
            expect(result.success).toBe(true);
        });

        it("accepts when neither budget field is provided", () => {
            const {budget_min, budget_max, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });
    });

    // ------------------------------------------------------------------ //
    //  Display Location                                                    //
    // ------------------------------------------------------------------ //

    describe("display_location", () => {
        it("accepts a valid display_location", () => {
            const result = jobPostSchema.safeParse({...validPayload, display_location: "London, UK"});
            expect(result.success).toBe(true);
        });

        it("accepts missing display_location", () => {
            const {display_location, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(true);
        });

        it("rejects display_location exceeding 255 characters", () => {
            const result = jobPostSchema.safeParse({...validPayload, display_location: "a".repeat(256)});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("display_location");
        });

        it("accepts display_location of exactly 255 characters", () => {
            const result = jobPostSchema.safeParse({...validPayload, display_location: "a".repeat(255)});
            expect(result.success).toBe(true);
        });
    });

    // ------------------------------------------------------------------ //
    //  Coordinates                                                         //
    // ------------------------------------------------------------------ //

    describe("latitude", () => {
        it("accepts valid latitude", () => {
            const result = jobPostSchema.safeParse({...validPayload, latitude: 51.5074});
            expect(result.success).toBe(true);
        });

        it("accepts latitude of exactly -90", () => {
            const result = jobPostSchema.safeParse({...validPayload, latitude: -90});
            expect(result.success).toBe(true);
        });

        it("accepts latitude of exactly 90", () => {
            const result = jobPostSchema.safeParse({...validPayload, latitude: 90});
            expect(result.success).toBe(true);
        });

        it("rejects latitude below -90", () => {
            const result = jobPostSchema.safeParse({...validPayload, latitude: -91});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("latitude");
        });

        it("rejects latitude above 90", () => {
            const result = jobPostSchema.safeParse({...validPayload, latitude: 91});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("latitude");
        });

        it("rejects missing latitude", () => {
            const {latitude, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("latitude");
        });
    });

    describe("longitude", () => {
        it("accepts valid longitude", () => {
            const result = jobPostSchema.safeParse({...validPayload, longitude: -0.1278});
            expect(result.success).toBe(true);
        });

        it("accepts longitude of exactly -180", () => {
            const result = jobPostSchema.safeParse({...validPayload, longitude: -180});
            expect(result.success).toBe(true);
        });

        it("accepts longitude of exactly 180", () => {
            const result = jobPostSchema.safeParse({...validPayload, longitude: 180});
            expect(result.success).toBe(true);
        });

        it("rejects longitude below -180", () => {
            const result = jobPostSchema.safeParse({...validPayload, longitude: -181});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("longitude");
        });

        it("rejects longitude above 180", () => {
            const result = jobPostSchema.safeParse({...validPayload, longitude: 181});
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("longitude");
        });

        it("rejects missing longitude", () => {
            const {longitude, ...rest} = validPayload;
            const result = jobPostSchema.safeParse(rest);
            expect(result.success).toBe(false);
            expect(result.error?.issues[0].path).toContain("longitude");
        });
    });

    // ------------------------------------------------------------------ //
    //  Full payload                                                        //
    // ------------------------------------------------------------------ //

    describe("full payload", () => {
        it("accepts a complete valid payload", () => {
            const result = jobPostSchema.safeParse(validPayload);
            expect(result.success).toBe(true);
        });

        it("accepts a minimal valid payload (title + coordinates only)", () => {
            const result = jobPostSchema.safeParse({
                title: "Fix sink",
                latitude: 40.7128,
                longitude: -74.0060,
            });
            expect(result.success).toBe(true);
        });

        it("rejects an empty object", () => {
            const result = jobPostSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });
});