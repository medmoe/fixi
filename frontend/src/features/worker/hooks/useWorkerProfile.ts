import {useQuery} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts'

export const useWorkerProfile = () => {
    return useQuery({
        queryKey: ['workerProfile'],
        queryFn: () => workerApi.getWorkerProfile(),
        staleTime: 5 * 60 * 1000,
    });
}


export const useWorkerProfilePublic = (workerId: number) => {
    return useQuery({
        queryKey: ["worker-profile", workerId],
        queryFn: () => workerApi.getWorkerProfilePublic(workerId),
        enabled: !!workerId,
        staleTime: 5 * 60 * 1000,
    });
};