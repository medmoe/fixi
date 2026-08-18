import {WorkerProfileWithTradesRead} from '@/features/worker'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";

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

export const createWrapper = (queryClient: QueryClient, initialEntries: string[] = ['/']) => {
    // Return a stable component reference
    const Wrapper = ({children}: { children: ReactNode }) => (
        <MemoryRouter future={{v7_relativeSplatPath: true, v7_startTransition: true}} initialEntries={initialEntries}>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </MemoryRouter>
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