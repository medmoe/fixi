import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {workerApi} from '@/lib/api/workerApi.ts';
import {UpdateWorkerProfilePayload, WorkerProfileWithTradesRead} from "@/features/worker/types/worker.types.ts";
import {toast} from 'sonner';

export const useUpdateWorkerProfile = () => {
    const {t} = useTranslation('worker');
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateWorkerProfilePayload) => workerApi.updateWorkerProfile(payload),
        onSuccess: (updatedProfile) => {
            queryClient.setQueryData<WorkerProfileWithTradesRead>(
                ['workerProfile'],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        ...updatedProfile,
                    }
                }
            )
            toast.success(t("toasts.profileUpdated"))
        },
        onError: () => {
            toast.error(t("toasts.profileUpdateFailed"))
        }
    })
}

