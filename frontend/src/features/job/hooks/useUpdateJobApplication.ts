import {useMutation, useQueryClient} from "@tanstack/react-query";
import {jobApi} from "@/lib";
import {JobApplicationRead, JobApplicationUpdate} from "@/features/job";

export const useUpdateJobApplication = () => {
    const queryClient = useQueryClient();

    return useMutation<JobApplicationRead, Error, { jobId: number; appId: number; payload: JobApplicationUpdate }>({
        mutationFn: ({jobId, appId, payload}) => jobApi.updateJobApplication(jobId, appId, payload),
        onSuccess: (_, variables) => {
            // Invalidate applications for this job
            queryClient.invalidateQueries({queryKey: ["job-applications", variables.jobId]});
            // Also invalidate my jobs to refresh job status if it changed
            queryClient.invalidateQueries({queryKey: ["jobs"]});
        },
    });
};