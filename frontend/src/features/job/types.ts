import {TradeCategoryRead} from "@/features/worker";
import {UserPublicRead} from "@/features/user";

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

export interface JobUpdateRequest extends JobBase {
    // latitude and longitude are optional for updates
    latitude?: number;
    longitude?: number;
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
    user: UserPublicRead | null;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';