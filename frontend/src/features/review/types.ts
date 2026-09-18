export interface ReviewCreate {
    rating: number;
    comment?: string;
}

export interface ReviewRead {
    id: number;
    rating: number;
    comment: string | null;
    role: "customer" | "worker";
    created_at: string;
}

export type ReviewEligibilityReason = "already_submitted" | "job_not_complete" | "not_a_participant";

export interface ReviewEligibility {
    can_review: boolean;
    reason: ReviewEligibilityReason | null;
}

export interface ReviewPublicRead {
    id: number;
    rating: number;
    comment: string | null;
    reviewer_display_name: string;
    created_at: string;
}

export type RatingBreakdown = Record<1 | 2 | 3 | 4 | 5, number>;

export interface WorkerReviewsMeta {
    average_rating: string | null;
    review_count: number;
    total_pages: number;
    rating_breakdown: RatingBreakdown;
}

export interface WorkerReviewsResponse {
    data: ReviewPublicRead[];
    next_cursor: string | null;
    meta: WorkerReviewsMeta;
}

export type ReviewSortBy = "recent" | "highest_rated";

export interface WorkerReviewEligibility {
    can_review: boolean;
    job_id: number | null;
}
