import {JobCreateRequest, JobRead} from "@/features/job";

export const mockJob: JobRead = {
    id: 1,
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    title: "Fix Leaking Kitchen Sink",
    description: "Kitchen sink has been leaking under the cabinet for two days. Need urgent repair.",
    trade_category_id: 3,
    user_id: 1,
    budget_min: "75.00",
    budget_max: "200.00",
    display_location: "New York, NY",
    status: "open",
    created_at: "2024-01-15T10:30:00",
    updated_at: "2024-01-15T10:30:00",
    deleted_at: null,
    is_deleted: false,
    customer_marked_complete_at: null,
    worker_marked_complete_at: null,
    user: null,
    trade_category: {
        id: 3,
        name: "plumbing",
        display_name: "Plumbing",
        parent_id: null,
        icon_name: "wrench",
        created_at: "2024-01-15T10:30:00",
    },
    coordinates: {
        latitude: 40.7128,
        longitude: -74.0060,
    },
};

export const mockCreateJobPayload: JobCreateRequest = {
    title: "Fix Leaking Kitchen Sink",
    description: "Kitchen sink has been leaking under the cabinet for two days. Need urgent repair.",
    trade_category_id: 3,
    budget_min: 75.00,
    budget_max: 200.00,
    display_location: "New York, NY",
    latitude: 40.7128,
    longitude: -74.0060,
}