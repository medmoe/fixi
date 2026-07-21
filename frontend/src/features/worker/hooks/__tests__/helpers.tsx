import {WorkerProfile} from '@/features/worker'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";

export const mockProfile: WorkerProfile = {
    id: 1,
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
