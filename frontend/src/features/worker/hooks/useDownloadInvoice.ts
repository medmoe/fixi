import {useMutation} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {toast} from "sonner";
import {workerBillingApi} from "@/lib";
import {formatApiError} from "@/lib/api/formatApiError";
import {downloadBlob} from "@/lib/downloadBlob";

/** Downloads a commission invoice PDF. Used by the worker's billing tab and the admin billing dashboard. */
export const useDownloadInvoice = () => {
    const {t} = useTranslation("worker");

    return useMutation({
        mutationFn: (workerBillingId: number) => workerBillingApi.downloadInvoice(workerBillingId),
        onSuccess: (blob, workerBillingId) => downloadBlob(blob, `invoice-${workerBillingId}.pdf`),
        onError: (error: any) => {
            toast.error(formatApiError(error, t, {}, "toasts.invoiceDownloadFailed"));
        },
    });
};
