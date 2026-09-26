import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {WorkerBillingAdminFilters} from '../types/workerBilling.types'

export const WORKER_BILLING_KEY = ['admin', 'worker-billing'] as const

export const useWorkerBillingDashboard = () => {
    const [filters, setFilters] = useState<WorkerBillingAdminFilters>({})

    const updateFilters = (partial: Partial<WorkerBillingAdminFilters>) => {
        setFilters((prev) => ({...prev, ...partial}))
    }

    const query = useQuery({
        queryKey: [...WORKER_BILLING_KEY, filters],
        queryFn: () => adminApi.listWorkerBilling(filters),
    })

    return {
        filters,
        updateFilters,
        records: query.data ?? [],
        isLoading: query.isLoading,
        isError: query.isError,
    }
}
