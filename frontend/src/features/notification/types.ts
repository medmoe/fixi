export interface NotificationRead {
    id: number;
    user_id: number;
    type: string;
    title_ar: string;
    title_fr: string;
    title_en: string;
    body_ar: string;
    body_fr: string;
    body_en: string;
    read_at: string | null;
    related_job_id: number | null;
    created_at: string;
}

export interface NotificationSocketMessage {
    type: 'notification';
    data: NotificationRead;
}

export type DevicePlatform = 'web' | 'ios' | 'android';

export interface DeviceTokenRead {
    id: number;
    user_id: number;
    token: string;
    platform: DevicePlatform;
    last_seen: string;
}

// SMS/OTP is intentionally never toggleable here -- see Issue 6/Issue 5,
// it's a mandatory auth requirement, not a preference.
export type NotificationPreferenceChannel = 'push' | 'email';

export interface NotificationPreference {
    event_type: string;
    channel: NotificationPreferenceChannel;
    enabled: boolean;
}
