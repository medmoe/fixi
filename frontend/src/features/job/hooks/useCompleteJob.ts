import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {jobApi} from "@/lib";

export const useCompleteJob = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => jobApi.completeJob(jobId),
        onSuccess: (job) => {
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            toast.success(job.status === "completed" ? "Job completed!" : "Marked as complete — waiting on the other party.");
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(error.response?.data?.detail ?? "Failed to mark job complete");
        },
    });
};
