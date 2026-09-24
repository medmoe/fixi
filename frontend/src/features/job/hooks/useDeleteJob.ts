import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";
import {formatApiError} from "@/lib/api/formatApiError";


export const useDeleteJob = () => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (jobId: number) => jobApi.deleteJob(jobId),
        onSuccess: (_data, jobId) => {
            queryClient.invalidateQueries({queryKey: ['jobs']}); // list membership changed
            queryClient.removeQueries({queryKey: ['job', jobId]}); // the job no longer exists — don't leave stale cache
            toast.success(t('toasts.jobDeleted'));
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, {}, 'toasts.jobDeleteFailed'));
        }
    })
}