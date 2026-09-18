import {useQuery} from "@tanstack/react-query";
import {reviewApi} from "@/lib";

/**
 * Powers the "Leave a review" CTA. `enabled` should be the caller's
 * isAuthenticated flag — this endpoint requires auth, so the rest of the
 * reviews section must never wait on it to render.
 */
export const useWorkerReviewEligibility = (workerProfileId: number, enabled: boolean) => {
    return useQuery({
        queryKey: ["worker-review-eligibility", workerProfileId],
        queryFn: () => reviewApi.getWorkerReviewEligibility(workerProfileId),
        enabled,
    });
};
