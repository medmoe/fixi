import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { jobApi } from "@/lib";
import { formatApiError } from "@/lib/api/formatApiError";
import type { JobApplicationCreate, JobApplicationRead } from "../types";

const KNOWN_ERRORS: Record<string, string> = {
    "You have already applied to this job": "toasts.alreadyApplied",
};

export const useApplyToJob = (jobId: number) => {
    const { t } = useTranslation("job");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: JobApplicationCreate) => jobApi.applyToJob(jobId, payload),
        onSuccess: (application: JobApplicationRead) => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            toast.success(t("toasts.applicationSubmitted"));
            return application;
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            // "not OPEN" detection runs on the raw (untranslated) backend
            // detail -- that message is dynamic (embeds the job's current
            // status) so it's never in KNOWN_ERRORS and always passes
            // through in English regardless of UI language anyway.
            const rawDetail = error.response?.data?.detail;
            toast.error(formatApiError(error, t, KNOWN_ERRORS, "toasts.applicationSubmitFailed"));

            // If the job's status changed since this page loaded (the "not
            // OPEN" race condition), refetch it so the disabled state on
            // the Apply button self-corrects without requiring a manual
            // page refresh.
            if (typeof rawDetail === "string" && rawDetail.toLowerCase().includes("not open")) {
                queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            }
        },
    });
};