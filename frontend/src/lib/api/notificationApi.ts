import {DevicePlatform, DeviceTokenRead, NotificationPreference, NotificationPreferenceChannel, NotificationRead} from "@/features/notification";
import {PaginatedListResponse} from "@/features/types";
import apiClient from "./apiClient";

export const notificationApi = {
    getNotifications: async (page: number = 1, itemsPerPage: number = 20, unreadOnly: boolean = false): Promise<PaginatedListResponse<NotificationRead>> => {
        const {data} = await apiClient.get<PaginatedListResponse<NotificationRead>>("/notifications", {
            params: {page, items_per_page: itemsPerPage, unread_only: unreadOnly},
        });
        return data;
    },
    markNotificationRead: async (id: number): Promise<NotificationRead> => {
        const {data} = await apiClient.patch<NotificationRead>(`/notifications/${id}/read`);
        return data;
    },
    markAllNotificationsRead: async (): Promise<void> => {
        await apiClient.patch("/notifications/read-all");
    },
    registerDeviceToken: async (token: string, platform: DevicePlatform): Promise<DeviceTokenRead> => {
        const {data} = await apiClient.post<DeviceTokenRead>("/notifications/device-tokens", {token, platform});
        return data;
    },
    unregisterDeviceToken: async (token: string): Promise<void> => {
        await apiClient.delete(`/notifications/device-tokens/${encodeURIComponent(token)}`);
    },
    getNotificationPreferences: async (): Promise<NotificationPreference[]> => {
        const {data} = await apiClient.get<NotificationPreference[]>("/notifications/preferences");
        return data;
    },
    updateNotificationPreference: async (eventType: string, channel: NotificationPreferenceChannel, enabled: boolean): Promise<NotificationPreference> => {
        const {data} = await apiClient.put<NotificationPreference>("/notifications/preferences", {event_type: eventType, channel, enabled});
        return data;
    },
};
