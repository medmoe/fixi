import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {formatRelativeDate} from "@/features/review";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("formatRelativeDate", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns 'just now' for a timestamp seconds ago", () => {
        const date = new Date(NOW.getTime() - 30 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("just now");
    });

    it("formats minutes ago", () => {
        const date = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("5 minutes ago");
    });

    it("formats hours ago", () => {
        const date = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("3 hours ago");
    });

    it("formats singular units without a trailing 's'", () => {
        const date = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("1 hour ago");
    });

    it("formats weeks ago", () => {
        const date = new Date(NOW.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("3 weeks ago");
    });

    it("formats months ago", () => {
        const date = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("3 months ago");
    });

    it("formats years ago", () => {
        const date = new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString();
        expect(formatRelativeDate(date)).toBe("1 year ago");
    });
});
