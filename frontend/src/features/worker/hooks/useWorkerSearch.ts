import {useEffect, useMemo, useState} from "react";
import {useSearchParams} from "react-router-dom";
import {useInfiniteQuery} from "@tanstack/react-query";
import {workerApi} from "@/lib";
import {filtersToSearchParams, searchParamsToFilters} from "../urlFilterSync";
import {selectUserLocation} from "@/features/user/userSlice";
import type {WorkerSearchFilters} from "../types";
import {useAppSelector} from "@/store/hooks.ts";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export const useWorkerSearch = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const storedLocation = useAppSelector(selectUserLocation);

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

    // effective filters sent to the API: URL filters win when explicitly set
    // (e.g. shared link with its own lat/lng), otherwise fall back to the
    // user's stored location from Redux so search "just works" without the
    // person re-entering coordinates on every visit.
    const effectiveFilters: WorkerSearchFilters = useMemo(() => {
        const hasExplicitCoords = urlFilters.latitude !== undefined && urlFilters.longitude !== undefined;
        if (hasExplicitCoords || storedLocation.latitude === null || storedLocation.longitude === null) {
            return urlFilters;
        }
        return {
            ...urlFilters,
            latitude: storedLocation.latitude,
            longitude: storedLocation.longitude,
        };
    }, [urlFilters, storedLocation]);

    const query = useInfiniteQuery({
        queryKey: ["workers", "search", effectiveFilters],
        queryFn: ({pageParam}) => workerApi.searchWorkers(effectiveFilters, pageParam, PAGE_SIZE),
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
        isUsingStoredLocation:
            !(urlFilters.latitude !== undefined && urlFilters.longitude !== undefined) &&
            storedLocation.latitude !== null,
    };
};