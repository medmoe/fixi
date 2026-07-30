import {useMutation, useQueryClient} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts';
import {UpdateWorkerProfilePayload, WorkerProfileWithTradesRead} from "@/features/worker/types/worker.types.ts";
import {toast} from 'sonner';

export const useUpdateWorkerProfile = () => {
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
            toast.success("Profile updated successfully")
        },
        onError: () => {
            toast.error("Failed to update worker profile")
        }
    })
}

