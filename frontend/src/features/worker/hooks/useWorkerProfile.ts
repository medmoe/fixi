import {useQuery} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts'

export const useWorkerProfile = () => {
    return useQuery({
        queryKey: ['workerProfile'],
        queryFn: () => workerApi.getWorkerProfile(),
        staleTime: 5 * 60 * 1000,
    });
}