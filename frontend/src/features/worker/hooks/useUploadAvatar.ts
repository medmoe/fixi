import {useMutation, useQueryClient} from '@tanstack/react-query';
import {workerApi} from "@/lib/api/workerApi";
import {toast} from 'sonner';

export const useUploadAvatar = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => workerApi.uploadAvatar(file),
        onSuccess: (updatedProfile) => {
            queryClient.setQueryData(
                ['workerProfile'],
                (old) => {
                    if (!old) return old;
                    return {
                        ...old,
                        ...updatedProfile
                    }
                }
            )
            toast.success("Avatar uploaded successfully");
        },
        onError: () => {
            toast.error("Failed to upload avatar")
        }
    })
}