import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {workerApi} from "@/lib/api/workerApi";
import {WorkerProfileWithTradesRead} from '@/features/worker'
import {toast} from 'sonner';

export const useAvailabilityToggle = () => {
    const {t} = useTranslation("worker");
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (isAvailable: boolean) =>
            workerApi.toggleAvailability(isAvailable),

        onMutate: async (newAvailability) => {
            await queryClient.cancelQueries({queryKey: ['workerProfile']});

            const previousProfile =
                queryClient.getQueryData<WorkerProfileWithTradesRead>(['workerProfile']);

            if (previousProfile) {
                queryClient.setQueryData<WorkerProfileWithTradesRead>(
                    ['workerProfile'],
                    {
                        ...previousProfile,
                        is_available: newAvailability,
                    }
                );
            }

            return {previousProfile};
        },

        onSuccess: (updatedProfile) => {
            queryClient.setQueryData<WorkerProfileWithTradesRead>(
                ['workerProfile'],
                (previousProfile) => {
                    if (!previousProfile) return previousProfile;

                    return {
                        ...previousProfile,
                        ...updatedProfile,
                    };
                }
            );

            toast.success(
                updatedProfile.is_available
                    ? t("toasts.nowAvailable")
                    : t("toasts.nowUnavailable")
            );
        },

        onError: (_err, _newAvailability, context) => {
            if (context?.previousProfile) {
                queryClient.setQueryData(
                    ['workerProfile'],
                    context.previousProfile
                );
            }

            toast.error(t("toasts.availabilityUpdateFailed"));
        },
    });
};