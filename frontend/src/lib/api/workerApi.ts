import {UpdateWorkerProfilePayload, WorkerProfileWithTradesRead} from "@/features/worker/types/worker.types.ts";
import {TradeCategoryRead, TradeCategoryWithChildren, WorkerTradeNestedRead} from "@/features/worker";
import apiClient from "@/lib/api/apiClient";

export const workerApi = {
    createWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfileWithTradesRead> => {
        const {data} = await apiClient.post<WorkerProfileWithTradesRead>('/worker-profile', payload);
        return data;
    },
    getWorkerProfile: async (): Promise<WorkerProfileWithTradesRead> => {
        const {data} = await apiClient.get<WorkerProfileWithTradesRead>(`/worker-profile`);
        return data;
    },
    updateWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfileWithTradesRead> => {
        const {data} = await apiClient.patch<WorkerProfileWithTradesRead>(`/worker-profile`, payload);
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
    getTrades: async (): Promise<TradeCategoryRead[] | TradeCategoryWithChildren[]> => {
        const {data} = await apiClient.get<TradeCategoryRead[] | TradeCategoryWithChildren[]>(`/trade-categories`)
        return data;
    },

    assignTrades: async (trade_category_ids: number[]): Promise<WorkerTradeNestedRead[]> => {
        const {data} = await apiClient.post<WorkerTradeNestedRead[]>(
            '/worker-profile/trade-categories/assign',
            {trade_category_ids},
        )
        return data
    },

    removeTrade: async (trade_category_id: number): Promise<WorkerTradeNestedRead[]> => {
        const {data} = await apiClient.delete<WorkerTradeNestedRead[]>(
            `/worker-profile/trade-categories/${trade_category_id}`,
        )
        return data
    },
}