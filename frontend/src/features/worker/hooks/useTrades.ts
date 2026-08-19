import {useQuery} from '@tanstack/react-query';
import {workerApi} from "@/lib";

export const useTrades = () => {
    return useQuery({
        queryKey: ['trades'],
        queryFn: () => workerApi.getTrades(),
        staleTime: 1000 * 60 * 60 // 1-hour stale time for mostly static asset lists
    })
}