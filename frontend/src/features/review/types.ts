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
