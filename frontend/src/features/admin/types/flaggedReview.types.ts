export interface FlaggedReviewRead {
    id: number;
    rating: number;
    comment: string | null;
    reviewer_name: string;
    reviewee_name: string;
    report_count: number;
    created_at: string;
}
