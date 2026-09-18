import type {ReviewCreate, ReviewEligibility, ReviewRead} from "@/features/review";
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
};
