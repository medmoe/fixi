import {useQuery} from "@tanstack/react-query";
import {jobApi} from "@/lib";
import {JobApplicationRead} from "@/features/job";
import {PaginatedListResponse} from "@/features/types";

export const useJobApplications = (jobId: number | null) => {
    return useQuery<PaginatedListResponse<JobApplicationRead>>({
        queryKey: ["job-applications", jobId],
        queryFn: () => {
            if (!jobId) throw new Error("Job ID is required");
            return jobApi.getJobApplications(jobId);
        },
        enabled: !!jobId,
        staleTime: 1000 * 30, // 30 seconds
    });
};