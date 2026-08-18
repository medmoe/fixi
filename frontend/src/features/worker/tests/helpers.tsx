import {WorkerProfileWithTradesRead} from '@/features/worker'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";

export const mockProfile: WorkerProfileWithTradesRead = {
    id: 1,
    user_id: 1,
    bio: 'Experienced plumber',
    hourly_rate: 75.00,
    service_radius_km: 20,
    is_available: false,
    is_verified: true,
    available_since: null,
    trade_categories: [],
    user: {
        id: 1,
        name: "Test user",
        location: null,
        display_location: "New York"
    },
    years_of_experience: 10,
    avatar_url: null
}

export const createWrapper = (queryClient: QueryClient) => {
    // Return a stable component reference
    const Wrapper = ({children}: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
    Wrapper.displayName = 'TestWrapper'
    return Wrapper
}

export const createQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    })