import axios from 'axios';
import {Trade, UpdateWorkerProfilePayload, WorkerProfile} from "@/features/worker/types/worker.types.ts";

const API_BASE = 'api/v1';

export const workerApi = {
    getWorkerProfile: async (id: number): Promise<WorkerProfile> => {
        const {data} = await axios.get<WorkerProfile>(`${API_BASE}/worker-profiles/${id}`);
        return data;
    },
    updateWorkerProfile: async (id: number, payload: UpdateWorkerProfilePayload): Promise<WorkerProfile> => {
        const {data} = await axios.patch<WorkerProfile>(`${API_BASE}/worker-profiles/${id}`, payload);
        return data;
    },
    toggleAvailability: async (id: number, isAvailable: boolean): Promise<{ is_available: boolean, available_since: string | null }> => {
        const {data} = await axios.patch<{ is_available: boolean, available_since: string | null }>(
            `${API_BASE}/worker-profiles/${id}/availability`,
            {is_available: isAvailable}
        )
        return data;
    },
    uploadAvatar: async (id: number, file: File): Promise<{ avatar_url: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const {data} = await axios.post<{ avatar_url: string }>(`${API_BASE}/worker-profiles/${id}/avatar`, formData, {headers: {'Content-Type': 'multipart/form-data'}});
        return data;
    },
    getTrades: async(): Promise<Trade[]> => {
        const { data } = await axios.get<Trade[]>(`${API_BASE}/trade-categories`)
        return data;
    }
}