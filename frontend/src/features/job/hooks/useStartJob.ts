import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {jobApi} from "@/lib";

export const useStartJob = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => jobApi.startJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success("Job started!");
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(error.response?.data?.detail ?? "Failed to start job");
        },
    });
};
