import {useMutation, useQueryClient} from "@tanstack/react-query";
import {workerApi} from "@/lib/api/workerApi";
import {WorkerProfile} from '../types/worker.types'
import {toast} from 'sonner';

export const useAvailabilityToggle = (workerId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
            mutationFn: (isAvailable: boolean) => workerApi.toggleAvailability(workerId, isAvailable),
            onMutate: async (newAvailability) => {
                // Cancel any outgoing refetching so they don't overwrite our optimistic update
                await queryClient.cancelQueries({queryKey: ['workerProfile', workerId]});

                // Snapshot the previous profile value
                const previousProfile = queryClient.getQueryData<WorkerProfile>(['workerProfile', workerId]);

                // Optimistically update the new value
                if (previousProfile) {
                    queryClient.setQueryData<WorkerProfile>(['workerProfile', workerId], {
                        ...previousProfile,
                        is_available: newAvailability,
                    });
                }
                return {previousProfile};
            },
            onError: (err, newAvailability, context) => {
                // Revert back to snapshot if server fails
                if (context?.previousProfile) {
                    queryClient.setQueryData(['workerProfile', workerId], context.previousProfile);
                }
                toast.error("Status update failed", {description: `Failed to update availability, please try again. ${newAvailability}::${err}`})
            },
            onSettled: () => {
                // Sync cache back up with ground truth server reality
                queryClient.invalidateQueries({queryKey: ['workerProfile', workerId]})
            }
        }
    )
}