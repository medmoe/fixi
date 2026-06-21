import {http, HttpResponse} from 'msw';

interface CreateJobPayload {
    title: string;
    description: string;
    service_category_id?: number | null;
    worker_id?: number | null;
    status?: string;
}

interface CreateProfilePayload {
    service_category_id?: number | null;
    profession?: string;
    hourly_rate?: number;
    skills?: string[];
    portfolio_image_urls?: string[];
}

interface CreateWorkerPayload extends CreateProfilePayload {
    worker_id?: number | null;
}

interface CreateRatingPayload {
    rating: number;
    comment?: string;
}

const mockSystems = [
    {
        id: 'sys-1',
        name: 'Primary Cluster',
        status: 'healthy',
        lastHeartbeat: '2026-02-14T10:15:00Z'
    },
    {
        id: 'sys-2',
        name: 'Edge Nodes',
        status: 'degraded',
        lastHeartbeat: '2026-02-14T10:12:00Z'
    },
    {
        id: 'sys-3',
        name: 'Backup Region',
        status: 'offline',
        lastHeartbeat: '2026-02-14T09:58:00Z'
    }
];

export const handlers = [
    http.post('/api/v1/auth/login', async ({request}) => {
        const body = (await request.json()) as { username_or_email?: string; password?: string };
        if (!body.username_or_email || !body.password) {
            return HttpResponse.json({detail: 'Invalid credentials'}, {status: 401});
        }
        return HttpResponse.json({access_token: 'mock-token', token_type: 'bearer'});
    }),
    http.post('/api/v1/auth/register', async ({request}) => {
        const body = (await request.json()) as { username?: string; email?: string; role?: string };
        if (!body.username || !body.email || !body.role) {
            return HttpResponse.json({detail: 'Invalid registration'}, {status: 422});
        }
        return HttpResponse.json({id: 1, username: body.username, email: body.email, role: body.role}, {status: 201});
    }),
    http.post('/api/v1/refresh', () => {
        return HttpResponse.json({access_token: 'refreshed-token', token_type: 'bearer'});
    }),
    http.get('/api/v1/user/me/', () => {
        return HttpResponse.json({
            id: 1,
            name: 'Alex',
            username: 'alex01',
            email: 'alex@example.com',
            profile_image_url: 'https://example.com/avatar.png',
            role_type: 'customer',
            tier_id: null
        });
    }),
    http.patch('/api/v1/user/:username', async ({params, request}) => {
        const payload = await request.json();
        if (!params.username || !payload) {
            return HttpResponse.json({detail: 'Invalid update'}, {status: 422});
        }
        return HttpResponse.json({message: 'User updated'});
    }),
    http.get('/api/v1/worker/me', () => {
        return HttpResponse.json({
            id: 10,
            user_id: 1,
            service_category_id: 2,
            profession: 'Plumber',
            hourly_rate: 55,
            skills: ['Pipe repair'],
            portfolio_image_urls: [],
            years_of_experience: 5,
            is_verified: true,
            bio: 'Experienced plumber.',
            availability_status: 'available',
            average_rating: 4.7,
            total_rating: 18
        });
    }),
    http.put('/api/v1/worker/profile', async ({request}) => {
        const payload = await request.json() as CreateProfilePayload;
        return HttpResponse.json({
            id: 10,
            user_id: 1,
            service_category_id: payload.service_category_id ?? 2,
            profession: payload.profession ?? 'Plumber',
            hourly_rate: payload.hourly_rate ?? 55,
            skills: payload.skills ?? ['Pipe repair'],
            portfolio_image_urls: payload.portfolio_image_urls ?? [],
            years_of_experience: 5,
            is_verified: true,
            bio: 'Experienced plumber.',
            availability_status: 'available',
            average_rating: 4.7,
            total_rating: 18
        });
    }),
    http.get('/api/v1/categories', () => {
        return HttpResponse.json([
            {id: 1, name: 'Electrical', description: 'Electrical repairs'},
            {id: 2, name: 'Plumbing', description: 'Plumbing services'}
        ]);
    }),
    http.get('/api/v1/professions', () => {
        return HttpResponse.json(['Electrician', 'Plumber', 'Carpenter']);
    }),
    http.post('/api/v1/files', async ({request}) => {
        await request.json();
        return HttpResponse.json({
            id: 99,
            belongs_to_user_id: 1,
            uploaded_at: new Date().toISOString(),
            file_key: 'mock/file.png',
            is_deleted: false,
            deleted_at: null,
            file_url: 'https://example.com/file.png',
        }, {status: 201});
    }),
    http.post('/api/v1/files/:fileId', () => {
        return HttpResponse.json({file_url: 'https://example.com/file.png'});
    }),
    http.get('/api/v1/jobs/me', () => {
        return HttpResponse.json([
            {
                id: 101,
                service_category_id: 2,
                customer_id: 1,
                worker_id: null,
                title: 'Fix kitchen sink',
                description: 'Leak under the sink needs repair.',
                status: 'open',
                created_at: '2026-02-14T08:00:00Z',
                updated_at: null
            },
            {
                id: 103,
                service_category_id: 1,
                customer_id: 1,
                worker_id: 7,
                title: 'Install outlet',
                description: 'Need a new outlet installed in the garage.',
                status: 'completed',
                created_at: '2026-02-13T08:00:00Z',
                updated_at: '2026-02-14T09:00:00Z'
            }
        ]);
    }),
    http.post('/api/v1/jobs', async ({request}) => {
        const payload = await request.json() as CreateJobPayload;
        return HttpResponse.json(
            {
                id: 102,
                service_category_id: payload.service_category_id ?? null,
                customer_id: 1,
                worker_id: payload.worker_id ?? null,
                title: payload.title,
                description: payload.description,
                status: payload.worker_id ? 'assigned' : 'open',
                created_at: '2026-02-14T09:00:00Z',
                updated_at: null
            },
            {status: 201}
        );
    }),
    http.get('/api/v1/jobs/:jobId', () => {
        return HttpResponse.json({
            id: 101,
            service_category_id: 2,
            customer_id: 1,
            worker_id: 7,
            title: 'Fix kitchen sink',
            description: 'Leak under the sink needs repair.',
            status: 'assigned',
            created_at: '2026-02-14T08:00:00Z',
            updated_at: '2026-02-14T09:30:00Z'
        });
    }),
    http.patch('/api/v1/jobs/:jobId/assign', async ({request}) => {
        const payload = await request.json() as CreateWorkerPayload;
        return HttpResponse.json({
            id: 101,
            service_category_id: 2,
            customer_id: 1,
            worker_id: payload.worker_id,
            title: 'Fix kitchen sink',
            description: 'Leak under the sink needs repair.',
            status: 'assigned',
            created_at: '2026-02-14T08:00:00Z',
            updated_at: '2026-02-14T09:30:00Z'
        });
    }),
    http.patch('/api/v1/jobs/:jobId/status', async ({request}) => {
        const payload = await request.json() as CreateJobPayload;
        return HttpResponse.json({
            id: 101,
            service_category_id: 2,
            customer_id: 1,
            worker_id: 7,
            title: 'Fix kitchen sink',
            description: 'Leak under the sink needs repair.',
            status: payload.status,
            created_at: '2026-02-14T08:00:00Z',
            updated_at: '2026-02-14T10:00:00Z'
        });
    }),
    http.post('/api/v1/jobs/:jobId/accept', () => {
        return HttpResponse.json({
            id: 101,
            service_category_id: 2,
            customer_id: 1,
            worker_id: 1,
            title: 'Fix kitchen sink',
            description: 'Leak under the sink needs repair.',
            status: 'assigned',
            created_at: '2026-02-14T08:00:00Z',
            updated_at: '2026-02-14T10:10:00Z'
        });
    }),
    http.post('/api/v1/jobs/:jobId/complete', () => {
        return HttpResponse.json({
            id: 101,
            service_category_id: 2,
            customer_id: 1,
            worker_id: 1,
            title: 'Fix kitchen sink',
            description: 'Leak under the sink needs repair.',
            status: 'completed',
            created_at: '2026-02-14T08:00:00Z',
            updated_at: '2026-02-14T11:00:00Z'
        });
    }),
    http.get('/api/v1/jobs/:jobId/review', () => {
        return HttpResponse.json({
            id: 401,
            job_id: 103,
            rating: 5,
            comment: 'Fantastic work.',
            created_at: '2026-02-14T12:00:00Z'
        });
    }),
    http.post('/api/v1/jobs/:jobId/review', async ({request}) => {
        const payload = await request.json() as CreateRatingPayload;
        return HttpResponse.json({
            id: 402,
            job_id: 103,
            rating: payload.rating,
            comment: payload.comment ?? null,
            created_at: '2026-02-14T12:30:00Z'
        }, {status: 201});
    }),
    http.patch('/api/v1/jobs/:jobId/review', async ({request}) => {
        const payload = await request.json() as CreateRatingPayload;
        return HttpResponse.json({
            id: 401,
            job_id: 103,
            rating: payload.rating ?? 5,
            comment: payload.comment ?? 'Fantastic work.',
            created_at: '2026-02-14T12:00:00Z'
        });
    }),
    http.delete('/api/v1/jobs/:jobId/review', () => {
        return HttpResponse.json({message: 'Review deleted'});
    }),
    http.get('/api/v1/workers', ({request}) => {
        const url = new URL(request.url);
        const profession = url.searchParams.get('profession');
        const data = [
            {
                id: 201,
                service_category_id: 2,
                profession: 'Plumber',
                hourly_rate: 55,
                skills: ['Pipe repair'],
                portfolio_image_urls: [],
                years_of_experience: 5,
                is_verified: true,
                bio: 'Experienced plumber.',
                availability_status: 'available',
                average_rating: 4.7,
                total_rating: 18,
                distance_km: null
            },
            {
                id: 202,
                service_category_id: 1,
                profession: 'Electrician',
                hourly_rate: 70,
                skills: ['Wiring'],
                portfolio_image_urls: [],
                years_of_experience: 7,
                is_verified: true,
                bio: 'Residential electrical specialist.',
                availability_status: 'available',
                average_rating: 4.9,
                total_rating: 24,
                distance_km: null
            }
        ];
        const filtered = profession ? data.filter((worker) => worker.profession.includes(profession)) : data;
        return HttpResponse.json({data: filtered, total_count: filtered.length, page: 1, items_per_page: 10});
    }),
    http.get('/api/v1/workers/:workerUserId/reviews', () => {
        return HttpResponse.json([
            {id: 301, job_id: 101, rating: 5, comment: 'Great work', created_at: '2026-02-10T08:00:00Z'}
        ]);
    }),
    http.get('/api/v1/workers/:workerUserId/rating', () => {
        return HttpResponse.json({worker_user_id: 1, average_rating: 4.7, total_reviews: 18});
    }),
    http.get('/api/v1/workers/nearby', () => {
        return HttpResponse.json([
            {
                user_id: 7,
                username: 'patfix',
                bio: 'Fast and tidy fixes.',
                location: 'POINT(-73.935242 40.73061)',
                distance_km: 3.4
            }
        ]);
    }),
    http.get('/api/v1/jobs/nearby', () => {
        return HttpResponse.json([
            {
                job_id: 900,
                title: 'Repair drywall',
                description: 'Small patch in hallway.',
                status: 'open',
                customer_id: 4,
                customer_username: 'chris',
                customer_location: 'POINT(-73.93 40.73)',
                distance_km: 2.1
            }
        ]);
    }),
    http.get('/systems', () => {
        return HttpResponse.json({
            data: mockSystems,
            metadata: {
                total: mockSystems.length,
                updatedAt: new Date().toISOString()
            }
        });
    })
];
