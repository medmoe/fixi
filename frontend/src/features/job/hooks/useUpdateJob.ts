import {useMutation, useQueryClient} from "@tanstack/react-query";
import {JobRead, JobUpdateRequest, PaginatedListResponse} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";


export const useUpdateJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: JobUpdateRequest }) => jobApi.updateJob(id, payload),
        onSuccess: (updatedJob: JobRead, variables) => {
            // Update the individual job cache
            queryClient.setQueryData(['job', updatedJob.id], updatedJob);

            // Update the jobs list cache if it exists
            queryClient.setQueryData(
                ['jobs'],
                (old: PaginatedListResponse<JobRead> | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map((job) =>
                            job.id === updatedJob.id ? updatedJob : job
                        ),
                    };
                }
            );

            // Invalidate the specific job query to ensure fresh data
            queryClient.invalidateQueries({queryKey: ['job', variables.id]});
            queryClient.invalidateQueries({queryKey: ['jobs']});

            toast.success('Job updated successfully');
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            const message = error.response?.data?.detail ?? 'Failed to update job';
            toast.error(message);
        }
    });
};