import {useQuery} from '@tanstack/react-query'
import {userApi} from '@/lib/api/userApi'
import {getAccessToken} from "@/lib/api/apiClient.ts";

export const USER_QUERY_KEY = ['user'] as const

export const useUser = () => {
    const hasToken = !!getAccessToken()
    return useQuery({
        queryKey: USER_QUERY_KEY,
        queryFn: () => userApi.me(),
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) return false
            return failureCount < 3
        },
        staleTime: 5 * 60 * 1000, // how long cached data is considered fresh :: here is 5 minutes
        enabled: hasToken,
    })
}