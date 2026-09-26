import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {workerApi} from "@/lib/api/workerApi";
import {formatApiError} from "@/lib/api/formatApiError";

export const portfolioImagesKey = (workerProfileId: number) => ["portfolio-images", workerProfileId] as const;

/** Public -- anyone can view a worker's portfolio. */
export const usePortfolioImages = (workerProfileId: number | undefined) => {
    return useQuery({
        queryKey: portfolioImagesKey(workerProfileId ?? 0),
        queryFn: () => workerApi.getPortfolioImages(workerProfileId!),
        enabled: workerProfileId !== undefined,
    });
};

const KNOWN_ERRORS: Record<string, string> = {
    "Maximum number of portfolio images reached": "toasts.portfolioLimitReached",
    "Invalid or unsupported image file.": "toasts.portfolioInvalidImage",
};

/** Owner only: uploads to the signed-in worker's own portfolio. */
export const useUploadPortfolioImage = (workerProfileId: number) => {
    const {t} = useTranslation("worker");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => workerApi.uploadPortfolioImage(file),
        onSuccess: () => {
            toast.success(t("toasts.portfolioImageUploaded"));
            queryClient.invalidateQueries({queryKey: portfolioImagesKey(workerProfileId)});
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, KNOWN_ERRORS, "toasts.portfolioImageUploadFailed"));
        },
    });
};

export const useDeletePortfolioImage = (workerProfileId: number) => {
    const {t} = useTranslation("worker");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (portfolioImageId: number) => workerApi.deletePortfolioImage(portfolioImageId),
        onSuccess: () => {
            toast.success(t("toasts.portfolioImageDeleted"));
            queryClient.invalidateQueries({queryKey: portfolioImagesKey(workerProfileId)});
        },
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, "toasts.portfolioImageDeleteFailed"));
        },
    });
};
