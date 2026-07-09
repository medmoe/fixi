import {WorkerProfile} from '../../types/worker.types'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";

export const WORKER_ID = 1

export const mockProfile: WorkerProfile = {
    id: WORKER_ID,
    user: {
        id: 42,
        name: 'John Doe',
        username: 'johndoe',
        email: 'johndoe@example.com',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        role_type: 'worker',
    },
    bio: 'Experienced plumber',
    hourly_rate: 75.00,
    service_radius_km: 20,
    is_available: false,
    is_verified: true,
    available_since: null,
    trades: [],
}

export const createWrapper = (queryClient: QueryClient) => {
    return ({children}: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

export const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    })
