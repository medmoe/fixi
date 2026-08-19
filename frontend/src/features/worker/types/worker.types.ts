import {WorkerTradeNestedRead} from "@/features/worker";
import {UserPublicRead} from "@/features/user";

export interface WorkerProfileRead {
    id: number;
    user_id: number;
    user: UserPublicRead
    bio: string | null;
    hourly_rate: number | null;
    years_of_experience: number | null;
    service_radius_km: number | null;
    avatar_url: string | null;
    is_available: boolean;
    is_verified: boolean;
    available_since: string | null;
}

export interface WorkerProfileWithTradesRead extends WorkerProfileRead {
    trade_categories: WorkerTradeNestedRead[];
}

export type WorkerSortBy = "distance" | "hourly_rate" | "experience";

export interface WorkerSearchFilters {
    trade_category_id?: number;
    min_hourly_rate?: number;
    max_hourly_rate?: number;
    min_years_of_experience?: number;
    max_years_of_experience?: number;
    service_radius_km?: number;
    is_available?: boolean;
    is_verified?: boolean;
    latitude?: number;
    longitude?: number;
    sort_by?: WorkerSortBy;
}

export interface UpdateWorkerProfilePayload {
    bio?: string;
    years_of_experience?: number;
    hourly_rate?: number;
    service_radius_km?: number;
}

export interface PaginatedResult<T> {
    data: T[];
}

export interface WorkerProfileCreateRequest {
    bio?: string;
    years_of_experience?: number;
    hourly_rate?: number;
    service_radius_km?: number;
}