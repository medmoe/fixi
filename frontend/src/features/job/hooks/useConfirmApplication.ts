import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {jobApi} from "@/lib";

export const useConfirmApplication = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (appId: number) => jobApi.confirmApplication(jobId, appId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["my-job-application", jobId]});
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success("Assignment confirmed!");
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(error.response?.data?.detail ?? "Failed to confirm assignment");
        },
    });
};
