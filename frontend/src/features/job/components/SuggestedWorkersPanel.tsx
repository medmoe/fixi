import React from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Loader2, MapPin, Users} from "lucide-react";
import {Button} from "@/components/ui/button";
import {WorkerCard, WorkerCardSkeleton} from "@/features/worker";
import type {JobRead} from "../types";
import {useNearbyWorkers} from "../hooks/useNearbyWorkers";

interface SuggestedWorkersPanelProps {
    job: JobRead;
}

/**
 * Owner-only suggestions of available workers near an open job. The caller
 * decides visibility (owner + open); this component only handles the
 * no-location prompt and the list itself.
 */
export const SuggestedWorkersPanel: React.FC<SuggestedWorkersPanelProps> = ({job}) => {
    const {t} = useTranslation("job");
    const hasLocation = job.coordinates !== null;
    const {workers, totalCount, hasMore, loadMore, isLoading, isFetchingNextPage, isError} = useNearbyWorkers(job.id, hasLocation);

    return (
        <section aria-labelledby="suggested-workers-heading" className="space-y-4">
            <div>
                <h2 id="suggested-workers-heading" className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5"/>
                    {t("suggestedWorkers.heading")}
                </h2>
                {hasLocation && !isLoading && !isError && workers.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">{t("suggestedWorkers.subheading", {count: totalCount})}</p>
                )}
            </div>

            {!hasLocation && (
                <div className="rounded-lg border border-dashed p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0"/>
                        {t("suggestedWorkers.noLocation")}
                    </p>
                    <Button asChild size="sm" variant="outline">
                        <Link to={`/dashboard/jobs/${job.id}/edit`}>{t("suggestedWorkers.addLocation")}</Link>
                    </Button>
                </div>
            )}

            {hasLocation && isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy="true">
                    <WorkerCardSkeleton/>
                    <WorkerCardSkeleton/>
                </div>
            )}

            {hasLocation && isError && <p className="text-sm text-destructive">{t("suggestedWorkers.loadError")}</p>}

            {hasLocation && !isLoading && !isError && workers.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("suggestedWorkers.emptyState")}</p>
            )}

            {workers.length > 0 && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {workers.map((worker) => (
                            <WorkerCard key={worker.id} profile={worker}/>
                        ))}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center">
                            <Button variant="outline" onClick={() => loadMore()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                                {t("suggestedWorkers.loadMore")}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};
