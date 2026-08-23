import {useMutation, useQueryClient} from "@tanstack/react-query";
import {JobCreateRequest, JobRead} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";


export const useCreateJob = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: JobCreateRequest) => jobApi.createJob(payload),
        onSuccess: (createdJob: JobRead) => {
            queryClient.invalidateQueries({queryKey: ['jobs']});
            queryClient.setQueryData(['job', createdJob.id], createdJob);
            toast.success('Job created successfully')
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            const message = error.response?.data?.detail ?? 'Failed to create job';
            toast.error(message);
        }

    })
}
