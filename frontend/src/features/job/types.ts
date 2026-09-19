import {TradeCategoryRead, WorkerProfileWithTradesRead} from "@/features/worker";
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
    customer_marked_complete_at: string | null;
    worker_marked_complete_at: string | null;
    trade_category: TradeCategoryRead | null;
    user: UserPublicRead | null;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface JobFilters {
    status?: JobStatus;
    trade_category_id?: number;
    user_id?: number;
    budget_min?: number;
    budget_max?: number;
    search?: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type ApplicationDeclineReason =
    | "price_disagreement"
    | "schedule_conflict"
    | "scope_mismatch"
    | "worker_unavailable"
    | "unresponsive"
    | "another_applicant_selected"
    | "other";

export const DECLINE_REASON_OPTIONS: { value: ApplicationDeclineReason; label: string }[] = [
    {value: "price_disagreement", label: "Price disagreement"},
    {value: "schedule_conflict", label: "Schedule conflict"},
    {value: "scope_mismatch", label: "Scope mismatch"},
    {value: "worker_unavailable", label: "Worker unavailable"},
    {value: "other", label: "Other"},
];

export interface JobApplicationBase {
    message?: string | null;
}

export interface JobApplicationRead extends JobApplicationBase {
    id: number;
    status: ApplicationStatus;
    accepted_at: string | null;
    worker_confirmed_at: string | null;
    decline_reason: ApplicationDeclineReason | null;
    job: JobRead | null;
    worker_profile: WorkerProfileWithTradesRead | null;
}

export interface JobApplicationCreate extends JobApplicationBase {}

export interface JobApplicationUpdate {
    status: ApplicationStatus;
    decline_reason?: ApplicationDeclineReason;
}

export interface JobApplicationWithdrawRequest {
    decline_reason: ApplicationDeclineReason;
}