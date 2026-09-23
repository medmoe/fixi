import React from "react";
import {Link} from "react-router-dom";
import {Loader2} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Skeleton} from "@/components/ui/skeleton";
import {useAuth} from "@/features/auth";
import {
    RatingBreakdownChart,
    RatingStars,
    ReviewListItem,
    ReviewsEmptyState,
    useWorkerReviewEligibility,
    useWorkerReviews,
} from "@/features/review";
import {useFormatNumber} from "@/lib/hooks/useFormatters";

interface ReviewsSectionProps {
    workerProfileId: number;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({workerProfileId}) => {
    const {t} = useTranslation("review");
    const formatNumber = useFormatNumber();
    const {isAuthenticated} = useAuth();
    const {reviews, meta, isLoading, isError, hasMore, loadMore, isFetchingNextPage} = useWorkerReviews(workerProfileId);
    // Auth-gated and independent of the query above — the rest of the
    // section is public and must never wait on this one to render.
    const {data: eligibility} = useWorkerReviewEligibility(workerProfileId, isAuthenticated);

    if (isLoading) {
        return (
            <div className="space-y-4" role="status" aria-label={t("reviewsSection.loadingAriaLabel")}>
                <Skeleton className="h-8 w-40"/>
                <Skeleton className="h-24 w-full"/>
                <Skeleton className="h-16 w-full"/>
            </div>
        );
    }

    if (isError) {
        return (
            <p role="alert" className="text-sm text-muted-foreground">
                {t("reviewsSection.loadError")}
            </p>
        );
    }

    const reviewCount = meta?.review_count ?? 0;
    const averageRating = meta?.average_rating !== null && meta?.average_rating !== undefined ? Number(meta.average_rating) : null;

    return (
        <section aria-labelledby="reviews-heading" className="space-y-6">
            <h2 id="reviews-heading" className="text-lg font-semibold">{t("reviewsSection.heading")}</h2>

            {/* Aggregate header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                    <RatingStars rating={averageRating ?? 0} size="lg"/>
                    <span className="text-2xl font-semibold">
                        {averageRating !== null ? formatNumber(averageRating, {minimumFractionDigits: 1, maximumFractionDigits: 1}) : "—"}
                    </span>
                </div>
                <span className="text-sm text-muted-foreground">
                    {t("shared.reviewCount", {count: reviewCount})}
                </span>
            </div>

            {reviewCount > 0 && meta && (
                <RatingBreakdownChart breakdown={meta.rating_breakdown} totalCount={reviewCount}/>
            )}

            {eligibility?.can_review && eligibility.job_id !== null && (
                <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="mb-2 text-sm">{t("reviewsSection.ctaPrompt")}</p>
                    <Button asChild size="sm">
                        <Link to={`/jobs/${eligibility.job_id}`}>{t("reviewsSection.leaveReviewLink")}</Link>
                    </Button>
                </div>
            )}

            {reviewCount === 0 ? (
                <ReviewsEmptyState/>
            ) : (
                <>
                    <div>
                        {reviews.map((review) => (
                            <ReviewListItem key={review.id} review={review}/>
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center">
                            <Button variant="outline" onClick={() => loadMore()} disabled={isFetchingNextPage}>
                                {isFetchingNextPage ? (
                                    <>
                                        <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                                        {t("reviewsSection.loading")}
                                    </>
                                ) : (
                                    t("reviewsSection.loadMore")
                                )}
                            </Button>
                        </div>
                    )}
                </>
            )}
        </section>
    );
};
