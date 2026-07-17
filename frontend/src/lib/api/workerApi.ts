import {UpdateWorkerProfilePayload, WorkerProfile} from "@/features/worker/types/worker.types.ts";
import {TradeCategory} from "@/features/worker/types/tradeCategory.types";
import apiClient from "@/lib/api/apiClient";

export const workerApi = {
    getWorkerProfile: async (id: number): Promise<WorkerProfile> => {
        const {data} = await apiClient.get<WorkerProfile>(`/worker-profiles/${id}`);
        return data;
    },
    updateWorkerProfile: async (id: number, payload: UpdateWorkerProfilePayload): Promise<WorkerProfile> => {
        const {data} = await apiClient.patch<WorkerProfile>(`/worker-profiles/${id}`, payload);
        return data;
    },
    toggleAvailability: async (id: number, isAvailable: boolean): Promise<{ is_available: boolean, available_since: string | null }> => {
        const {data} = await apiClient.patch<{ is_available: boolean, available_since: string | null }>(
            `/worker-profiles/${id}/availability`,
            {is_available: isAvailable}
        )
        return data;
    },
    uploadAvatar: async (id: number, file: File): Promise<{ avatar_url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const {data} = await apiClient.post<{ avatar_url: string }>(`/worker-profiles/${id}/avatar`, formData, {headers: {'Content-Type': 'multipart/form-data'}});
        return data;
    },
    getTrades: async (): Promise<TradeCategory[]> => {
        const {data} = await apiClient.get<TradeCategory[]>(`/trade-categories`)
        return data;
    }
}