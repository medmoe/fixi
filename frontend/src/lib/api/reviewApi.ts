import type {ReviewCreate, ReviewEligibility, ReviewRead, ReviewSortBy, WorkerReviewEligibility, WorkerReviewsResponse} from "@/features/review";
import apiClient from "./apiClient";

export const reviewApi = {
    getReviewStatus: async (jobId: number): Promise<ReviewEligibility> => {
        const {data} = await apiClient.get<ReviewEligibility>(`/jobs/${jobId}/review-status`);
        return data;
    },
    submitReview: async (jobId: number, payload: ReviewCreate): Promise<ReviewRead> => {
        const {data} = await apiClient.post<ReviewRead>(`/jobs/${jobId}/reviews`, payload);
        return data;
    },
    getWorkerReviews: async (
        workerProfileId: number,
        params: {cursor?: string; limit?: number; sort?: ReviewSortBy} = {}
    ): Promise<WorkerReviewsResponse> => {
        const {data} = await apiClient.get<WorkerReviewsResponse>(`/worker-profile/${workerProfileId}/reviews`, {params});
        return data;
    },
    getWorkerReviewEligibility: async (workerProfileId: number): Promise<WorkerReviewEligibility> => {
        const {data} = await apiClient.get<WorkerReviewEligibility>(`/worker-profile/${workerProfileId}/review-eligibility`);
        return data;
    },
    reportReview: async (reviewId: number, reason?: string): Promise<void> => {
        await apiClient.post(`/reviews/${reviewId}/report`, {reason: reason ?? null});
    },
};
