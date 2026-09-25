import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {JobCreateRequest, JobRead} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";
import {formatApiError} from "@/lib/api/formatApiError";

const KNOWN_ERRORS: Record<string, string> = {
    "Trade category does not exist": "toasts.tradeCategoryNotFound",
    "Maximum number of active jobs reached": "toasts.maxActiveJobsReached",
};

export const useCreateJob = () => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: JobCreateRequest) => jobApi.createJob(payload),
        onSuccess: (createdJob: JobRead) => {
            queryClient.invalidateQueries({queryKey: ['jobs']});
            queryClient.setQueryData(['job', createdJob.id], createdJob);
            toast.success(t('toasts.jobCreated'))
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, KNOWN_ERRORS, 'toasts.jobCreateFailed'));
        }

    })
}
