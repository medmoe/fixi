import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {jobApi} from "@/lib";
import {formatApiError} from "@/lib/api/formatApiError";
import type {ApplicationDeclineReason} from "../types";

export const useWithdrawApplication = (jobId: number) => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({appId, declineReason}: { appId: number; declineReason: ApplicationDeclineReason }) =>
            jobApi.withdrawApplication(jobId, appId, {decline_reason: declineReason}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["my-job-application", jobId]});
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success(t("toasts.applicationWithdrawn"));
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, {}, "toasts.withdrawApplicationFailed"));
        },
    });
};
