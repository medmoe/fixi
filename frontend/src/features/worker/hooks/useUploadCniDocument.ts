import {useMutation, useQueryClient} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {workerApi} from "@/lib/api/workerApi";
import {toast} from 'sonner';

export const useUploadCniDocument = () => {
    const {t} = useTranslation('worker');
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => workerApi.uploadCniDocument(file),
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
            toast.success(t("toasts.cniUploaded"));
        },
        onError: () => {
            toast.error(t("toasts.cniUploadFailed"))
        }
    })
}
