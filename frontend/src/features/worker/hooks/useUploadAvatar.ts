import {useMutation, useQueryClient} from '@tanstack/react-query';
import {workerApi} from "@/lib/api/workerApi.ts";
import {toast} from 'sonner';

export const useUploadAvatar = (workerId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => workerApi.uploadAvatar(workerId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['workerProfile', workerId]})
            toast.success("Avatar uploaded successfully");
        },
        onError: () => {
            toast.error("Failed to upload avatar")
        }
    })
}