import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {JobRead, JobUpdateRequest} from "@/features/job";
import {jobApi} from "@/lib";
import {toast} from "sonner";
import {AxiosError} from "axios";
import {formatApiError} from "@/lib/api/formatApiError";


export const useUpdateJob = () => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({id, payload}: { id: number; payload: JobUpdateRequest }) => jobApi.updateJob(id, payload),
        onSuccess: (updatedJob: JobRead) => {
            queryClient.invalidateQueries({queryKey: ['jobs']})
            queryClient.setQueryData(['job', updatedJob.id], updatedJob);
            toast.success(t('toasts.jobUpdated'));
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, {}, 'toasts.jobUpdateFailed'));
        }
    });
};