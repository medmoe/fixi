import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {jobApi} from "@/lib";
import type {ApplicationDeclineReason} from "../types";

export const useWithdrawApplication = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({appId, declineReason}: { appId: number; declineReason: ApplicationDeclineReason }) =>
            jobApi.withdrawApplication(jobId, appId, {decline_reason: declineReason}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["my-job-application", jobId]});
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success("Application withdrawn");
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(error.response?.data?.detail ?? "Failed to withdraw application");
        },
    });
};
