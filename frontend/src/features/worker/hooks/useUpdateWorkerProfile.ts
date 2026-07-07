import {useMutation, useQueryClient} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts';
import {UpdateWorkerProfilePayload} from "@/features/worker/types/worker.types.ts";
import {toast} from 'sonner';

export const useUpdateWorkerProfile = (workerId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UpdateWorkerProfilePayload) => workerApi.updateWorkerProfile(workerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['workerProfile', workerId]});
            toast.success("Profile updated successfully")
        },
        onError: () => {
            toast.error("Failed to update worker profile")
        }
    })
}

