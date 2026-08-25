import {JobFilters} from "@/features/job/types";

const NUMBER_KEYS: (keyof JobFilters)[] = ["trade_category_id", "user_id", "budget_min", "budget_max"];
const STRING_KEYS: (keyof JobFilters)[] = ["status", "search"];

export const filtersToSearchParams = (filters: JobFilters): URLSearchParams => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, String(value));
        }
    });
    return params;
};

export const searchParamsToFilters = (params: URLSearchParams): JobFilters => {
    const filters: JobFilters = {};

    for (const key of NUMBER_KEYS) {
        const raw = params.get(key);
        if (raw !== null && raw !== "") {
            const num = Number(raw);
            if (!Number.isNaN(num)) {
                (filters as Record<string, number>)[key] = num;
            }
        }
    }

    for (const key of STRING_KEYS) {
        const raw = params.get(key);
        if (raw !== null && raw !== "") {
            (filters as Record<string, string>)[key] = raw;
        }
    }

    return filters;
};