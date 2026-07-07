import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useToast} from '@/components/ui/use-toast';
import {workerApi} from "@/lib/api/workerApi.ts";

export const useUploadAvatar = (workerId: number) => {
    const queryClient = useQueryClient();
    const {toast} = useToast();

    return useMutation({
        mutationFn: (file: File) => workerApi.uploadAvatar(workerId, file),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['workerProfile', workerId]})
            toast({title: 'success', description: 'Avatar uploaded successfully'});
        },
        onError: () => {
            toast({variant: 'destructive', title: 'Avatar upload failed', description: 'Could not upload image file.'})
        }
    })
}