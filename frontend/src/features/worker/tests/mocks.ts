import {TradeCategoryRead, WorkerProfileWithTradesRead, WorkerTradeNestedRead} from "@/features/worker";

export const mockTrades: WorkerTradeNestedRead[] = [
    {
        id: 1,
        worker_profile_id: 1,
        trade_category_id: 10,
        skill_level: 'junior',
        trade_category: {id: 10, name: 'plumbing', display_name: 'Plumbing', icon_name: null, parent_id: null, created_at: null},
    },
]

export const mockWorker = (id: number, overrides: Partial<WorkerProfileWithTradesRead> = {}): WorkerProfileWithTradesRead => ({
    id,
    user_id: id,
    user: {id, name: `Worker ${id}`, location: null, display_location: null},
    bio: "Experienced plumber with 5+ years fixing leaks and installing fixtures.",
    hourly_rate: 75.00,
    years_of_experience: 5,
    service_radius_km: 20,
    is_available: false,
    is_verified: false,
    trade_categories: [{
        id: 1,
        trade_category_id: 1,
        worker_profile_id: 1,
        trade_category: {display_name: "Plumbing", created_at: "2020-01-01", parent_id: null, icon_name: "wrench", id: 1, name: "plumbing"},
        skill_level: "junior"
    },
    {
        id: 2,
        trade_category_id: 2,
        worker_profile_id: 1,
        trade_category: {display_name: "Electrical", created_at: "2020-01-01", parent_id: null, icon_name: "bolt", id: 2, name: "electrical"},
        skill_level: "junior"
    }
    ],
    avatar_url: null,
    available_since: null,
    ...overrides
});

export const mockWorkers: WorkerProfileWithTradesRead[] = [mockWorker(1), mockWorker(2)];


export const mockTradeCategories: TradeCategoryRead[] = [
    {id: 1, name: 'plumbing', display_name: 'Plumbing', icon_name: 'wrench', parent_id: null, created_at: '2026-01-01T00:00:00.000Z'},
    {id: 2, name: 'electrical', display_name: 'Electrical', icon_name: 'zap', parent_id: null, created_at: '2026-01-01T00:00:00.000Z'},
    {id: 3, name: 'carpentry', display_name: 'Carpentry', icon_name: 'hammer', parent_id: null, created_at: '2026-01-01T00:00:00.000Z'},
]

export const mockAssignedTrades: WorkerTradeNestedRead[] = [
    {
        id: 1,
        worker_profile_id: 1,
        trade_category_id: 1,
        skill_level: 'mid',
        trade_category: mockTradeCategories[0],
    }
]

export const mockUser = {
    id: 1,
    name: 'John Doe',
    username: 'john_doe',
    email: 'john@example.com',
    role_type: 'worker',
}

export const mockAvailableWorkerProfile: WorkerProfileWithTradesRead = {
    ...mockWorker(1),
    is_available: true,
}

export const mockWorkerCardUnverifiedUnavailable: WorkerProfileWithTradesRead = {
    ...mockWorker(1),
    id: 2,
    user: {id: 2, name: "Erin Ellis", location: null, display_location: null},
    is_verified: false,
    is_available: false,
};

export const mockWorkerCardNoBio: WorkerProfileWithTradesRead = {
    ...mockWorker(1),
    id: 3,
    bio: null,
    trade_categories: [],
};