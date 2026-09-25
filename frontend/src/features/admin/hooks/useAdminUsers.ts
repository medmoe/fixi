import {useEffect, useState} from 'react'
import {useInfiniteQuery} from '@tanstack/react-query'
import {adminApi} from '@/lib/api/adminApi'
import type {AdminUserFilters} from '../types/adminUser.types'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

export const useAdminUsers = () => {
    // local filter state updates immediately on user interaction, debounced
    // before it triggers a query -- mirrors useWorkerSearch's pattern (minus
    // URL sync, not needed for an internal admin tool).
    const [pendingFilters, setPendingFilters] = useState<AdminUserFilters>({})
    const [effectiveFilters, setEffectiveFilters] = useState<AdminUserFilters>({})

    useEffect(() => {
        const timeout = setTimeout(() => setEffectiveFilters(pendingFilters), DEBOUNCE_MS)
        return () => clearTimeout(timeout)
    }, [pendingFilters])

    const query = useInfiniteQuery({
        queryKey: ['admin', 'users', effectiveFilters],
        queryFn: ({pageParam}) => adminApi.listUsers(effectiveFilters, pageParam, PAGE_SIZE),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const fetchedSoFar = allPages.reduce((sum, page) => sum + page.data.length, 0)
            return lastPage.has_more ? fetchedSoFar : undefined
        },
    })

    const updateFilters = (partial: Partial<AdminUserFilters>) => {
        setPendingFilters((prev) => ({...prev, ...partial}))
    }

    const users = query.data?.pages.flatMap((page) => page.data) ?? []
    const totalCount = query.data?.pages[0]?.total_count ?? 0

    return {
        filters: pendingFilters,
        updateFilters,
        users,
        totalCount,
        hasMore: query.hasNextPage ?? false,
        loadMore: query.fetchNextPage,
        isLoading: query.isLoading,
        isFetchingNextPage: query.isFetchingNextPage,
        isError: query.isError,
    }
}
