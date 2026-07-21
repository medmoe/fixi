import {UpdateWorkerProfilePayload, WorkerProfile} from "@/features/worker/types/worker.types.ts";
import {TradeCategory} from "@/features/worker/types/tradeCategory.types";
import apiClient from "@/lib/api/apiClient";

export const workerApi = {
    createWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfile> => {
        const {data} = await apiClient.post<WorkerProfile>('/worker-profile', payload);
        return data;
    },
    getWorkerProfile: async (): Promise<WorkerProfile> => {
        const {data} = await apiClient.get<WorkerProfile>(`/worker-profile`);
        return data;
    },
    updateWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfile> => {
        const {data} = await apiClient.patch<WorkerProfile>(`/worker-profile`, payload);
        return data;
    },
    toggleAvailability: async (isAvailable: boolean): Promise<{ is_available: boolean, available_since: string | null }> => {
        const {data} = await apiClient.patch<{ is_available: boolean, available_since: string | null }>(
            `/worker-profile/availability`,
            {is_available: isAvailable}
        )
        return data;
    },
    uploadAvatar: async (file: File): Promise<{ avatar_url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const {data} = await apiClient.post<{ avatar_url: string }>(`/worker-profiles/avatar`, formData, {headers: {'Content-Type': 'multipart/form-data'}});
        return data;
    },
    getTrades: async (): Promise<TradeCategory[]> => {
        const {data} = await apiClient.get<TradeCategory[]>(`/trade-categories`)
        return data;
    }
}