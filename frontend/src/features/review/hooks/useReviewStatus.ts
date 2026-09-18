import {useQuery} from "@tanstack/react-query";
import {reviewApi} from "@/lib";

export const useReviewStatus = (jobId: number | null) => {
    return useQuery({
        queryKey: ["review-status", jobId],
        queryFn: () => {
            if (jobId === null) throw new Error("Job ID is required");
            return reviewApi.getReviewStatus(jobId);
        },
        enabled: jobId !== null,
    });
};
