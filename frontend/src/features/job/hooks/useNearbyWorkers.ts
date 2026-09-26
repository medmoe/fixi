import {useInfiniteQuery} from "@tanstack/react-query";
import {jobApi} from "@/lib";

const PAGE_SIZE = 6;

/** Available workers near a job, nearest first -- job owner only (enforced server-side). */
export const useNearbyWorkers = (jobId: number, enabled: boolean) => {
    const query = useInfiniteQuery({
        queryKey: ["job", jobId, "nearby-workers"],
        queryFn: ({pageParam}) => jobApi.getNearbyWorkers(jobId, pageParam, PAGE_SIZE),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            const fetchedSoFar = allPages.reduce((sum, page) => sum + page.data.length, 0);
            return lastPage.has_more ? fetchedSoFar : undefined;
        },
        enabled,
    });

    return {
        workers: query.data?.pages.flatMap((page) => page.data) ?? [],
        totalCount: query.data?.pages[0]?.total_count ?? 0,
        hasMore: query.hasNextPage ?? false,
        loadMore: query.fetchNextPage,
        isLoading: query.isLoading,
        isFetchingNextPage: query.isFetchingNextPage,
        isError: query.isError,
    };
};
