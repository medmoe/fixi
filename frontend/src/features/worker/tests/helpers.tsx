import {WorkerProfileWithTradesRead} from '@/features/worker'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import type {ReactNode} from "react";
import {MemoryRouter} from "react-router-dom";
import {Provider} from "react-redux";
import {store} from "@/store";

export const mockProfile: WorkerProfileWithTradesRead = {
    id: 1,
    user_id: 1,
    bio: 'Experienced plumber',
    hourly_rate: "75.00",
    service_radius_km: 20,
    is_available: false,
    is_verified: true,
    has_cni_document: false,
    available_since: null,
    average_rating: null,
    review_count: 0,
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
        <Provider store={store}>
            <MemoryRouter future={{v7_relativeSplatPath: true, v7_startTransition: true}} initialEntries={initialEntries}>
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            </MemoryRouter>
        </Provider>
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