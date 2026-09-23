import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import {WorkerFilterPanel, useWorkerSearch, WorkerCard, WorkerCardSkeletonGrid, WorkerSearchEmptyState} from "@/features/worker";

export const WorkerSearchPage: React.FC = () => {
    const {t} = useTranslation("worker");
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
                    {isLoading ? t("workerSearchPage.searching") : t("workerSearchPage.workersFoundCount", {count: totalCount})}
                </p>

                {isError && (
                    <p className="text-sm text-destructive">
                        {t("workerSearchPage.loadError")}
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
                                            <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                                            {t("workerSearchPage.loading")}
                                        </>
                                    ) : (
                                        t("workerSearchPage.loadMore")
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
