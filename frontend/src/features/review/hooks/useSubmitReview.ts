import {useMutation, useQueryClient} from "@tanstack/react-query";
import {AxiosError} from "axios";
import {toast} from "sonner";
import {reviewApi} from "@/lib";
import type {ReviewCreate, ReviewRead} from "../types";

export const useSubmitReview = (jobId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ReviewCreate) => reviewApi.submitReview(jobId, payload),
        onSuccess: (review: ReviewRead) => {
            queryClient.invalidateQueries({queryKey: ["review-status", jobId]});
            toast.success("Review submitted!");
            return review;
        },
        onError: (error: AxiosError<{ detail: string }>) => {
            const message = error.response?.data?.detail ?? "Failed to submit review";
            toast.error(message);
        },
    });
};
