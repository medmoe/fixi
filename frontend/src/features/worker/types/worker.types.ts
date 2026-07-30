import {WorkerTradeNestedRead} from "@/features/worker";

export interface WorkerProfileRead {
    id: number;
    user_id: number;
    bio?: string;
    hourly_rate?: number;
    years_of_experience?: number;
    service_radius_km?: number;
    avatar_url?: string;
    is_available: boolean;
    is_verified: boolean;
    available_since: string | null;
}

export interface WorkerProfileWithTradesRead extends WorkerProfileRead {
    trade_categories: WorkerTradeNestedRead[];
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