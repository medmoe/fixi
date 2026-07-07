import {useMutation, useQueryClient} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts';
import {UpdateWorkerProfilePayload} from "@/features/worker/types/worker.types.ts";
import {useToast} from '@/components/ui/use-toast';

export const useUpdateWorkerProfile = (workerId: number) => {
    const queryClient = useQueryClient();
    const {toast} = useToast();

    return useMutation({
        mutationFn: (payload: UpdateWorkerProfilePayload) => workerApi.updateWorkerProfile(workerId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['workerProfile', workerId]});
            toast({title: "Success", description: "Worker profile updated successfully"})
        },
        onError: () => {
            toast({variant: "destructive", title: "Error", description: "Failed to update worker profile"})
        }
    })
}

