import {useMutation, useQueryClient} from "@tanstack/react-query";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";


export const useDeleteJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: number) => jobApi.deleteJob(jobId),
        onSuccess: (_data, jobId) => {
            queryClient.invalidateQueries({queryKey: ['jobs']}); // list membership changed
            queryClient.removeQueries({queryKey: ['job', jobId]}); // the job no longer exists — don't leave stale cache
            toast.success('Job deleted successfully');
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(error.response?.data?.detail ?? 'Failed to delete job');
        }
    })
}