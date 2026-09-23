import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {act, renderHook} from "@testing-library/react";
import {useLocalizedTradeName} from "../../hooks/useLocalizedTradeName";
import i18n from "@/lib/i18n";

describe("useLocalizedTradeName", () => {
    afterEach(async () => {
        // Wrapped in act() -- the previous test's renderHook tree is still
        // mounted at this point (RTL's own cleanup afterEach hasn't run
        // yet), and this resets i18next's active language, which
        // react-i18next reacts to.
        await act(async () => {
            await i18n.changeLanguage("fr");
        });
    });

    const resolve = (trade: Parameters<ReturnType<typeof useLocalizedTradeName>>[0]) => {
        const {result} = renderHook(() => useLocalizedTradeName());
        return result.current(trade);
    };

    describe("in English", () => {
        beforeEach(async () => {
            await i18n.changeLanguage("en");
        });

        it("returns the English display_name", () => {
            expect(resolve({display_name: "Electrician", display_name_ar: "كهربائي", display_name_fr: "Électricien"})).toBe("Electrician");
        });
    });

    describe("in Arabic", () => {
        beforeEach(async () => {
            await i18n.changeLanguage("ar");
        });

        it("returns the Arabic translation when present", () => {
            expect(resolve({display_name: "Electrician", display_name_ar: "كهربائي", display_name_fr: "Électricien"})).toBe("كهربائي");
        });

        it("falls back to English when the Arabic translation is missing", () => {
            expect(resolve({display_name: "Electrician", display_name_ar: null, display_name_fr: "Électricien"})).toBe("Electrician");
        });

        it("falls back to English when display_name_ar is simply absent from the object", () => {
            expect(resolve({display_name: "Electrician"})).toBe("Electrician");
        });
    });

    describe("in French", () => {
        beforeEach(async () => {
            await i18n.changeLanguage("fr");
        });

        it("returns the French translation when present", () => {
            expect(resolve({display_name: "Electrician", display_name_ar: "كهربائي", display_name_fr: "Électricien"})).toBe("Électricien");
        });

        it("falls back to English when the French translation is missing", () => {
            expect(resolve({display_name: "Electrician", display_name_ar: "كهربائي", display_name_fr: null})).toBe("Electrician");
        });
    });

    it("returns an empty string for a null/undefined trade", () => {
        expect(resolve(null)).toBe("");
        expect(resolve(undefined)).toBe("");
    });

    it("returns an empty string when even display_name is null", () => {
        expect(resolve({display_name: null})).toBe("");
    });
});
