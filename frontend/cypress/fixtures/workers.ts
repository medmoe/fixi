
export const mockTradeCategories = [
    { id: 1, name: 'plumber', display_name: 'Plumber' },
    { id: 2, name: 'electrician', display_name: 'Electrician' },
]

export const mockWorker = (overrides: Partial<any> = {}) => ({
    id: 1,
    user_id: 1,
    user: { id: 1, name: 'Javier Hensley' },
    bio: 'Experienced plumber with 5+ years fixing leaks and installing fixtures.',
    hourly_rate: '75.00',
    years_of_experience: 5,
    service_radius_km: 20,
    is_available: true,
    is_verified: true,
    avatar_url: null,
    trade_categories: [
        {
            id: 1,
            trade_category: { id: 1, name: 'plumber', display_name: 'Plumber' },
            skill_level: 'senior',
        },
    ],
    ...overrides,
})

export const mockSearchResponse = (workers: any[], total?: number) => ({
    data: workers,
    total_count: total ?? workers.length,
    has_more: false,
    items_per_page: 20,
})