import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {workerApi} from "@/lib/api/workerApi";
import {toast} from 'sonner';

export const useUploadAvatar = () => {
    const {t} = useTranslation('worker');
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
            toast.success(t("toasts.avatarUploaded"));
        },
        onError: () => {
            toast.error(t("toasts.avatarUploadFailed"))
        }
    })
}