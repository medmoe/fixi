import {TradeCategoryRead, TradeCategoryWithChildren, UpdateWorkerProfilePayload, WorkerProfileRead, WorkerProfileWithTradesRead, WorkerSearchFilters, WorkerTradeNestedRead} from "@/features/worker";
import apiClient from "@/lib/api/apiClient";
import {PaginatedListResponse} from "@/features/types";

export const workerApi = {
    createWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfileWithTradesRead> => {
        const {data} = await apiClient.post<WorkerProfileWithTradesRead>('/worker-profile', payload);
        return data;
    },
    getWorkerProfile: async (): Promise<WorkerProfileWithTradesRead> => {
        const {data} = await apiClient.get<WorkerProfileWithTradesRead>(`/worker-profile`);
        return data;
    },
    updateWorkerProfile: async (payload: UpdateWorkerProfilePayload): Promise<WorkerProfileRead> => {
        const {data} = await apiClient.patch<WorkerProfileRead>(`/worker-profile`, payload);
        return data;
    },
    toggleAvailability: async (isAvailable: boolean): Promise<WorkerProfileRead> => {
        const {data} = await apiClient.patch<WorkerProfileRead>(
            `/worker-profile/availability`,
            {is_available: isAvailable}
        )
        return data;
    },
    uploadAvatar: async (file: File): Promise<WorkerProfileRead> => {
        const formData = new FormData();
        formData.append('file', file);
        const {data} = await apiClient.post<WorkerProfileRead>(`/worker-profile/avatar`, formData, {headers: {'Content-Type': 'multipart/form-data'}});
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
    searchWorkers: async (filters: WorkerSearchFilters, offset: number, limit: number): Promise<PaginatedListResponse<WorkerProfileWithTradesRead>> => {
        const params = {...filters, offset, limit}
        const {data} = await apiClient.get<PaginatedListResponse<WorkerProfileWithTradesRead>>(`/worker-profile/search`, {params})
        return data
    }
}