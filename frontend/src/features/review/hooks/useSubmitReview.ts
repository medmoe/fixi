import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {reviewApi} from "@/lib";
import {formatApiError} from "@/lib/api/formatApiError";
import type {ReviewCreate, ReviewRead} from "../types";

const KNOWN_ERRORS: Record<string, string> = {
    "You are not a participant in this job.": "toasts.notAParticipant",
    "This job is not yet complete.": "toasts.jobNotComplete",
    "You have already reviewed this job.": "toasts.alreadyReviewed",
};

export const useSubmitReview = (jobId: number) => {
    const {t} = useTranslation("review");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReviewCreate) => reviewApi.submitReview(jobId, payload),
        onSuccess: (review: ReviewRead) => {
            queryClient.invalidateQueries({queryKey: ["review-status", jobId]});
            toast.success(t("toasts.reviewSubmitted"));
            return review;
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            toast.error(formatApiError(error, t, KNOWN_ERRORS, "toasts.reviewSubmitFailed"));
        },
    });
};
