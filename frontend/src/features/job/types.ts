import {TradeCategoryRead} from "@/features/worker";

export interface JobBase {
    title: string;
    description?: string;
    trade_category_id?: number;
    budget_min?: number;
    budget_max?: number;
    display_location?: string;
}

export interface JobCreateRequest extends JobBase {
    latitude: number;
    longitude: number;
}

export interface JobRead {
    id: number;
    uuid: string;
    title: string;
    user_id: number;
    status: JobStatus;
    created_at: string;
    is_deleted: boolean;
    coordinates: Coordinates | null;
    description: string | null;
    trade_category_id: number | null;
    budget_min: string | null;
    budget_max: string | null;
    display_location: string | null;
    updated_at: string | null;
    deleted_at: string | null;
    trade_category: TradeCategoryRead | null;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface PaginatedListResponse<T> {
    data: T[];
    total_count: number;
    has_more: boolean;
    page: number | null;
    items_per_page: number | null;
}