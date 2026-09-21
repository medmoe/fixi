export interface NotificationRead {
    id: number;
    user_id: number;
    type: string;
    title_ar: string;
    title_fr: string;
    body_ar: string;
    body_fr: string;
    read_at: string | null;
    related_job_id: number | null;
    created_at: string;
}

export interface NotificationSocketMessage {
    type: 'notification';
    data: NotificationRead;
}
