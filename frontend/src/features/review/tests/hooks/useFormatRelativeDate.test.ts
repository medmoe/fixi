import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, renderHook} from "@testing-library/react";
import {useFormatRelativeDate} from "../../hooks/useFormatRelativeDate";
import i18n from "@/lib/i18n";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("useFormatRelativeDate", () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
        await i18n.changeLanguage("en");
    });

    afterEach(async () => {
        vi.useRealTimers();
        // Wrapped in act() -- the previous test's renderHook tree is still
        // mounted at this point (RTL's own cleanup afterEach hasn't run
        // yet), and this resets i18next's active language, which
        // react-i18next reacts to.
        await act(async () => {
            await i18n.changeLanguage("fr");
        });
    });

    const format = (isoDate: string) => {
        const {result} = renderHook(() => useFormatRelativeDate());
        return result.current(isoDate);
    };

    it("returns 'just now' for a timestamp seconds ago", () => {
        const date = new Date(NOW.getTime() - 30 * 1000).toISOString();
        expect(format(date)).toBe("just now");
    });

    it("formats minutes ago (plural)", () => {
        const date = new Date(NOW.getTime() - 5 * 60 * 1000).toISOString();
        expect(format(date)).toBe("5 minutes ago");
    });

    it("formats singular units without a trailing 's'", () => {
        const date = new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString();
        expect(format(date)).toBe("1 hour ago");
    });

    it("formats weeks ago", () => {
        const date = new Date(NOW.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString();
        expect(format(date)).toBe("3 weeks ago");
    });

    it("formats months ago", () => {
        const date = new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        expect(format(date)).toBe("3 months ago");
    });

    it("formats years ago", () => {
        const date = new Date(NOW.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString();
        expect(format(date)).toBe("1 year ago");
    });

    describe("localization", () => {
        it("formats in French", async () => {
            await i18n.changeLanguage("fr");
            const date = new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString();
            expect(format(date)).toBe("il y a 3 heures");
        });

        it("formats in Arabic using the dual form for exactly two", async () => {
            await i18n.changeLanguage("ar");
            const date = new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString();
            expect(format(date)).toBe("منذ ساعتين");
        });

        it("formats in Arabic using the few form for 3-10", async () => {
            await i18n.changeLanguage("ar");
            const date = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
            expect(format(date)).toBe("منذ 5 أيام");
        });

        it("formats in Arabic using the many form for 11-99", async () => {
            await i18n.changeLanguage("ar");
            const date = new Date(NOW.getTime() - 15 * 60 * 60 * 1000).toISOString();
            expect(format(date)).toBe("منذ 15 ساعة");
        });
    });
});
