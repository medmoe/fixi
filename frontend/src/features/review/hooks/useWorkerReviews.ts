import {useInfiniteQuery} from "@tanstack/react-query";
import {reviewApi} from "@/lib";
import type {ReviewSortBy} from "../types";

export const useWorkerReviews = (workerProfileId: number, sort: ReviewSortBy = "recent") => {
    const query = useInfiniteQuery({
        queryKey: ["worker-reviews", workerProfileId, sort],
        queryFn: ({pageParam}) => reviewApi.getWorkerReviews(workerProfileId, {cursor: pageParam, sort}),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    });

    const reviews = query.data?.pages.flatMap((page) => page.data) ?? [];
    const meta = query.data?.pages[0]?.meta;

    return {
        reviews,
        meta,
        isLoading: query.isLoading,
        isError: query.isError,
        hasMore: query.hasNextPage ?? false,
        loadMore: query.fetchNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
