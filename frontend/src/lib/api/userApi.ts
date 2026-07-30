import apiClient from "@/lib/api/apiClient.ts";

import type {UserChangePasswordPayload, UserRead, UserUpdate} from "@/features/user/types/user.types.ts";

export const userApi = {
    me: async (): Promise<UserRead> => {
        const {data} = await apiClient.get<UserRead>("/user/me");
        return data
    },
    getUser: async (username: string): Promise<UserRead> => {
        const {data} = await apiClient.get<UserRead>(`/user/${username}`);
        return data
    },
    updateUser: async (username: string, payload: UserUpdate): Promise<UserRead> => {
        const {data} = await apiClient.patch(`/user/${username}`, payload);
        return data
    },
    deleteUser: async (username: string): Promise<void> => {
        await apiClient.delete(`/user/${username}`);
    },
    changePassword: async (username: string, payload: UserChangePasswordPayload): Promise<void> => {
        await apiClient.patch(`/user/${username}/password`, payload);
    },
}