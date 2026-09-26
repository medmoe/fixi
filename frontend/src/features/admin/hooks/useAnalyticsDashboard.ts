import {useState} from 'react'
import {useQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {AnalyticsDateRangeFilters} from '../types/analytics.types'

export const ANALYTICS_KEY = ['admin', 'analytics'] as const

export const useAnalyticsDashboard = () => {
    const [filters, setFilters] = useState<AnalyticsDateRangeFilters>({})

    const updateFilters = (partial: Partial<AnalyticsDateRangeFilters>) => {
        setFilters((prev) => ({...prev, ...partial}))
    }

    const overviewQuery = useQuery({
        queryKey: [...ANALYTICS_KEY, 'overview', filters],
        queryFn: () => adminApi.getAnalyticsOverview(filters),
    })
    const breakdownQuery = useQuery({
        queryKey: [...ANALYTICS_KEY, 'breakdown', filters],
        queryFn: () => adminApi.getAnalyticsBreakdown(filters),
    })
    const funnelQuery = useQuery({
        queryKey: [...ANALYTICS_KEY, 'funnel', filters],
        queryFn: () => adminApi.getAnalyticsFunnel(filters),
    })

    return {
        filters,
        updateFilters,
        overview: overviewQuery.data,
        breakdown: breakdownQuery.data,
        funnel: funnelQuery.data,
        isLoading: overviewQuery.isLoading || breakdownQuery.isLoading || funnelQuery.isLoading,
        isError: overviewQuery.isError || breakdownQuery.isError || funnelQuery.isError,
    }
}
