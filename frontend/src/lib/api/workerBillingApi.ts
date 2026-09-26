import apiClient from "@/lib/api/apiClient";
import type {WorkerBillingRead} from "@/features/worker";

export const workerBillingApi = {
    /** The signed-in worker's own commission records, most recent due date first. */
    getMyBilling: async (): Promise<WorkerBillingRead[]> => {
        const {data} = await apiClient.get<WorkerBillingRead[]>("/worker-billing/me");
        return data;
    },
    /** PDF invoice for one billing record -- allowed for the worker it belongs to, or an admin. */
    downloadInvoice: async (workerBillingId: number): Promise<Blob> => {
        const {data} = await apiClient.get<Blob>(`/worker-billing/${workerBillingId}/invoice`, {responseType: "blob"});
        return data;
    },
};
