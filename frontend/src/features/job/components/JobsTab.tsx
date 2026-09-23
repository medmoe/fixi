import React from "react";
import {Link} from "react-router-dom";
import {Loader2} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge.tsx";
import {Button} from "@/components/ui/button.tsx";
import {JobRead, JobsFilterPanel, JobStatus, useGetJobs} from "@/features/job";
import {useFormatCurrency} from "@/lib/hooks/useFormatters";

const statusColors: Record<JobStatus, string> = {
    open: "bg-green-100 text-green-800",
    assigned: "bg-blue-100 text-blue-800",
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
};

const JobCard: React.FC<{ job: JobRead }> = ({job}) => {
    const {t} = useTranslation("job");
    const formatCurrency = useFormatCurrency();

    return (
    <Link
        to={`/jobs/${job.id}`}
        className="block rounded-lg border hover:shadow-md transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
        <article
            aria-label={t("jobsTab.jobPostingAriaLabel", {title: job.title})}
            className="p-4 space-y-2"
        >
            <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{job.title}</p>
                <Badge className={statusColors[job.status]}>{job.status.replace("_", " ")}</Badge>
            </div>
            {job.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
            )}
            <div className="flex items-center justify-between text-sm pt-2 border-t text-muted-foreground">
                <span>
                    {job.budget_min && job.budget_max
                        ? `${formatCurrency(Number(job.budget_min))} – ${formatCurrency(Number(job.budget_max))}`
                        : t("jobsTab.budgetNotSpecified")}
                </span>
                {job.display_location && <span>{job.display_location}</span>}
            </div>
        </article>
    </Link>
    );
};

const JobCardSkeleton: React.FC = () => {
    const {t} = useTranslation("job");

    return (
    <div role="status" aria-label={t("jobsTab.loadingJobAriaLabel")} className="p-4 border rounded-lg space-y-2 animate-pulse">
        <div className="h-4 w-2/3 bg-muted rounded"/>
        <div className="h-3 w-full bg-muted rounded"/>
        <div className="h-3 w-1/3 bg-muted rounded"/>
    </div>
    );
};

export const JobsTab: React.FC = () => {
    const {t} = useTranslation("job");
    const {
        filters,
        updateFilters,
        jobs,
        totalCount,
        hasMore,
        loadMore,
        isLoading,
        isFetchingNextPage,
        isError,
    } = useGetJobs();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 p-6">
            <aside>
                <JobsFilterPanel filters={filters} onChange={updateFilters}/>
            </aside>

            <main>
                <p className="text-sm text-muted-foreground mb-4">
                    {isLoading ? t("jobsTab.loadingJobs") : t("jobsTab.jobsFoundCount", {count: totalCount})}
                </p>

                {isError && (
                    <p className="text-sm text-destructive">
                        {t("jobsTab.loadError")}
                    </p>
                )}

                {isLoading && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.from({length: 4}).map((_, i) => (
                            <JobCardSkeleton key={i}/>
                        ))}
                    </div>
                )}

                {!isLoading && !isError && jobs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-lg font-medium">{t("jobsTab.noJobsFound")}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t("jobsTab.noJobsHint")}
                        </p>
                    </div>
                )}

                {!isLoading && jobs.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {jobs.map((job) => (
                                <JobCard key={job.id} job={job}/>
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
                                            {t("jobsTab.loading")}
                                        </>
                                    ) : (
                                        t("jobsTab.loadMore")
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
