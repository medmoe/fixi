import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useInfiniteQuery} from "@tanstack/react-query";
import {workerApi} from "@/lib";
import {filtersToSearchParams, searchParamsToFilters} from "@/features/worker/urlFilterSync";
import type {WorkerSearchFilters} from "../types";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export const useWorkerSearch = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // filters read from the URL — source of truth on load/refresh/share
    const urlFilters = useMemo(() => searchParamsToFilters(searchParams), [searchParams]);

    // local filter state — updates immediately on user interaction,
    // debounced before it's pushed to the URL / triggers a query
    const [pendingFilters, setPendingFilters] = useState<WorkerSearchFilters>(urlFilters);

    // debounce: push pendingFilters -> URL after 300ms of no changes
    useEffect(() => {
        const timeout = setTimeout(() => {
            const params = filtersToSearchParams(pendingFilters);
            setSearchParams(params, {replace: true});
        }, DEBOUNCE_MS);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFilters]);

    const query = useInfiniteQuery({
        queryKey: ["workers", "search", urlFilters],
        queryFn: ({pageParam}) => workerApi.searchWorkers(urlFilters, pageParam, PAGE_SIZE),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const fetchedSoFar = allPages.reduce((sum, page) => sum + page.data.length, 0);
            return lastPage.has_more ? fetchedSoFar : undefined;
        },
    });

    const updateFilters = (partial: Partial<WorkerSearchFilters>) => {
        setPendingFilters((prev) => ({...prev, ...partial}));
    };

    const workers = query.data?.pages.flatMap((page) => page.data) ?? [];
    const totalCount = query.data?.pages[0]?.total_count ?? 0;

    return {
        filters: pendingFilters,
        updateFilters,
        workers,
        totalCount,
        hasMore: query.hasNextPage ?? false,
        loadMore: query.fetchNextPage,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        isFetchingNextPage: query.isFetchingNextPage,
        isError: query.isError,
        error: query.error,
    };
};