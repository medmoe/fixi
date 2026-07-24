import {useMutation, useQueryClient} from "@tanstack/react-query";
import {workerApi} from "@/lib/api/workerApi";
import {WorkerProfileWithTradesRead} from '../types/worker.types'
import {toast} from 'sonner';

export const useAvailabilityToggle = (workerId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
            mutationFn: (isAvailable: boolean) => workerApi.toggleAvailability(workerId, isAvailable),
            onMutate: async (newAvailability) => {
                // Cancel any outgoing refetching so they don't overwrite our optimistic update
                await queryClient.cancelQueries({queryKey: ['workerProfile', workerId]});

                // Snapshot the previous profile value
                const previousProfile = queryClient.getQueryData<WorkerProfileWithTradesRead>(['workerProfile', workerId]);

                // Optimistically update the new value
                if (previousProfile) {
                    queryClient.setQueryData<WorkerProfileWithTradesRead>(['workerProfile', workerId], {
                        ...previousProfile,
                        is_available: newAvailability,
                    });
                }
                return {previousProfile};
            },
            onSuccess: (serverResponseData) => {
                queryClient.setQueryData<WorkerProfileWithTradesRead>(['workerProfile', workerId], (previousProfile) => {
                    if (!previousProfile) return undefined;
                    // Overwrite our quick optimistic guess with the absolute truth from the server
                    return {
                        ...previousProfile,
                        is_available: serverResponseData.is_available,
                        available_since: serverResponseData.available_since,
                    };
                });
                toast.success(serverResponseData.is_available ? "You are now available" : "You are now unavailable")
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