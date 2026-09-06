
export const mockCustomer = {
    id: 1,
    name: 'Jane Customer',
    email: 'jane@customer.com',
    role_type: 'customer' as const,
}

export const mockWorkerUser = {
    id: 2,
    name: 'Javier Hensley',
    email: 'javier@worker.com',
    role_type: 'worker' as const,
}

export const mockWorkerProfile = (overrides: Partial<any> = {}) => ({
    id: 1,
    user_id: 2,
    user: {id: 2, name: 'Javier Hensley'},
    bio: 'Experienced plumber.',
    hourly_rate: '75.00',
    years_of_experience: 5,
    service_radius_km: 20,
    is_available: true,
    is_verified: false,
    avatar_url: null,
    trade_categories: [],
    ...overrides,
})

export const mockJob = (overrides: Partial<any> = {}): any => ({
    id: 10,
    uuid: 'job-uuid-10',
    title: 'Fix leaking kitchen sink',
    status: 'open',
    user_id: 1,
    created_at: '2026-09-01T12:00:00Z',
    updated_at: null,
    deleted_at: null,
    is_deleted: false,
    description: 'The kitchen sink has been leaking for a week.',
    coordinates: null,
    trade_category_id: null,
    budget_min: null,
    budget_max: null,
    display_location: null,
    trade_category: null,
    user: {id: 1, name: 'Jane Customer'},
    ...overrides,
})

export const mockJobsResponse = (jobs: any[]) => ({
    data: jobs,
    total_count: jobs.length,
    has_more: false,
    page: 1,
    items_per_page: 50,
})

export const mockApplication = (overrides: Partial<any> = {}): any => ({
    id: 100,
    status: 'pending',
    message: 'I can fix it today.',
    job: null,
    worker_profile: {
        id: 1,
        user_id: 2,
        user: {id: 2, name: 'Javier Hensley'},
        bio: 'Experienced plumber.',
        hourly_rate: '75.00',
        years_of_experience: 5,
        service_radius_km: 20,
        is_available: true,
        is_verified: false,
        avatar_url: null,
        trade_categories: [],
    },
    ...overrides,
})

export const mockApplicationsResponse = (apps: any[]) => ({
    data: apps,
    total_count: apps.length,
    has_more: false,
    page: 1,
    items_per_page: 50,
})
