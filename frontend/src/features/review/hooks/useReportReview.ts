import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {reviewApi} from "@/lib/api/reviewApi";
import {formatApiError} from "@/lib/api/formatApiError";

export const useReportReview = () => {
    const {t} = useTranslation("review");

    return useMutation({
        mutationFn: (reviewId: number) => reviewApi.reportReview(reviewId),
        onSuccess: () => {
            toast.success(t("toasts.reviewReported"));
        },
        onError: (error: any) => {
            const knownErrors = {"You have already reported this review": "toasts.alreadyReported"};
            toast.error(formatApiError(error, t, knownErrors, "toasts.reviewReportFailed"));
        },
    });
};
