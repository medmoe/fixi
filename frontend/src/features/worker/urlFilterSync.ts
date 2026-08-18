import type {WorkerSearchFilters, WorkerSortBy} from "@/features/worker";

const BOOLEAN_KEYS: (keyof WorkerSearchFilters)[] = ["is_available", "is_verified"];
const NUMBER_KEYS: (keyof WorkerSearchFilters)[] = [
    "trade_category_id",
    "min_hourly_rate",
    "max_hourly_rate",
    "min_years_of_experience",
    "max_years_of_experience",
    "service_radius_km",
    "latitude",
    "longitude",
];

export const filtersToSearchParams = (filters: WorkerSearchFilters): URLSearchParams => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            params.set(key, String(value));
        }
    });
    return params;
};

export const searchParamsToFilters = (params: URLSearchParams): WorkerSearchFilters => {
    const filters: WorkerSearchFilters = {};

    for (const key of NUMBER_KEYS) {
        const raw = params.get(key);
        if (raw !== null && raw !== "") {
            const num = Number(raw);
            if (!Number.isNaN(num)) {
                (filters as Record<string, number>)[key] = num;
            }
        }
    }

    for (const key of BOOLEAN_KEYS) {
        const raw = params.get(key);
        if (raw === "true") (filters as Record<string, boolean>)[key] = true;
        if (raw === "false") (filters as Record<string, boolean>)[key] = false;
    }

    const sortBy = params.get("sort_by");
    if (sortBy === "distance" || sortBy === "hourly_rate" || sortBy === "experience") {
        filters.sort_by = sortBy as WorkerSortBy;
    }

    return filters;
};