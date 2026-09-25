import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {jobApi} from "@/lib";
import {formatApiError} from "@/lib/api/formatApiError";

const KNOWN_ERRORS: Record<string, string> = {
    "Another application is already accepted for this job": "toasts.applicationAlreadyAccepted",
};

export const useConfirmApplication = (jobId: number) => {
    const {t} = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (appId: number) => jobApi.confirmApplication(jobId, appId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ["my-job-application", jobId]});
            queryClient.invalidateQueries({queryKey: ["job", jobId]});
            queryClient.invalidateQueries({queryKey: ["jobs"]});
            toast.success(t("toasts.assignmentConfirmed"));
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, KNOWN_ERRORS, "toasts.confirmApplicationFailed"));
        },
    });
};
