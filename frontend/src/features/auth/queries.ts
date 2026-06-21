import {useQuery} from '@tanstack/react-query';
import {apiRequest} from "./api";

const BaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1'
type ServiceCategory = {
    id: number;
    name: string;
    description?: string;
};

async function fetchServiceCategories(): Promise<ServiceCategory[]> {
    return await apiRequest<ServiceCategory[]>(`${BaseUrl}/service-categories`);
}

export function useServiceCategoriesQuery() {
    return useQuery({
        queryKey: ['service-categories'],
        queryFn: fetchServiceCategories,
    })
}