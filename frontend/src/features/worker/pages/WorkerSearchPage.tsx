import React from "react";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import {WorkerFilterPanel, useWorkerSearch, WorkerCard, WorkerCardSkeletonGrid, WorkerSearchEmptyState} from "@/features/worker";

export const WorkerSearchPage: React.FC = () => {
    const {
        filters,
        updateFilters,
        workers,
        totalCount,
        hasMore,
        loadMore,
        isLoading,
        isFetchingNextPage,
        isError,
    } = useWorkerSearch();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 p-6">
            <aside>
                <WorkerFilterPanel filters={filters} onChange={updateFilters}/>
            </aside>

            <main>
                <p className="text-sm text-muted-foreground mb-4">
                    {isLoading ? "Searching..." : `${totalCount} workers found`}
                </p>

                {isError && (
                    <p className="text-sm text-destructive">
                        Something went wrong loading results. Please try again.
                    </p>
                )}

                {isLoading && <WorkerCardSkeletonGrid/>}

                {!isLoading && !isError && workers.length === 0 && <WorkerSearchEmptyState/>}

                {!isLoading && !isError && workers.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {workers.map((worker) => (
                                <WorkerCard key={worker.id} profile={worker}/>
                            ))}
                        </div>

                        {hasMore && (
                            <div className="flex justify-center mt-6">
                                <Button
                                    variant="outline"
                                    onClick={() => loadMore()}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            Loading...
                                        </>
                                    ) : (
                                        "Load more"
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};