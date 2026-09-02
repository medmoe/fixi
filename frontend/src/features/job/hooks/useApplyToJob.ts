import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { jobApi } from "@/lib";
import type { JobApplicationCreate, JobApplicationRead } from "../types";

export const useApplyToJob = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: JobApplicationCreate) => jobApi.applyToJob(jobId, payload),
        onSuccess: (application: JobApplicationRead) => {
            queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            toast.success("Application submitted!");
            return application;
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            const message = error.response?.data?.detail ?? "Failed to submit application";
            toast.error(message);

            // If the job's status changed since this page loaded (the "not
            // OPEN" race condition), refetch it so the disabled state on
            // the Apply button self-corrects without requiring a manual
            // page refresh.
            const detail = message.toLowerCase();
            if (detail.includes("not open")) {
                queryClient.invalidateQueries({ queryKey: ["job", jobId] });
            }
        },
    });
};