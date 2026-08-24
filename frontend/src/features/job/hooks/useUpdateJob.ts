import {useMutation, useQueryClient} from "@tanstack/react-query";
import {JobRead, JobUpdateRequest} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";


export const useUpdateJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: JobUpdateRequest }) => jobApi.updateJob(id, payload),
        onSuccess: (updatedJob: JobRead) => {
            queryClient.invalidateQueries({queryKey: ['jobs']})
            queryClient.setQueryData(['job', updatedJob.id], updatedJob);
            toast.success('Job updated successfully');
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            const message = error.response?.data?.detail ?? 'Failed to update job';
            toast.error(message);
        }
    });
};