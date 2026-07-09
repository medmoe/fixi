import {useQuery} from '@tanstack/react-query';
import {workerApi} from '@/lib/api/workerApi.ts'

export const useWorkerProfile = (workerId: number) => {
    return useQuery({
        queryKey: ['workerProfile', workerId],
        queryFn: () => workerApi.getWorkerProfile(workerId),
        staleTime: 5 * 60 * 1000,
        enabled: !!workerId,
    });
}