import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {jobApi} from "@/lib";
import {formatApiError} from "@/lib/api/formatApiError";

export const useStartJob = (jobId: number) => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => jobApi.startJob(jobId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success(t("toasts.jobStarted"));
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, {}, "toasts.jobStartFailed"));
        },
    });
};
