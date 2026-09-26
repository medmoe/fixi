import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'

export const WORKER_VERIFICATION_QUEUE_KEY = ['admin', 'worker-verifications'] as const

export const useWorkerVerificationQueue = () => {
    return useQuery({
        queryKey: WORKER_VERIFICATION_QUEUE_KEY,
        queryFn: () => adminApi.listWorkerVerifications(),
    })
}
