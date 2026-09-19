import {useQuery} from "@tanstack/react-query";
import {jobApi} from "@/lib";

/** Worker-facing — their own application for this job, or null if they never applied. */
export const useMyJobApplication = (jobId: number, enabled: boolean = true) => {
    return useQuery({
        queryKey: ["my-job-application", jobId],
        queryFn: () => jobApi.getMyApplication(jobId),
        enabled,
    });
};
