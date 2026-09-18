import React from "react";
import {Link} from "react-router-dom";
import {Loader2} from "lucide-react";
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

interface ReviewsSectionProps {
    workerProfileId: number;
}

export const ReviewsSection: React.FC<ReviewsSectionProps> = ({workerProfileId}) => {
    const {isAuthenticated} = useAuth();
    const {reviews, meta, isLoading, isError, hasMore, loadMore, isFetchingNextPage} = useWorkerReviews(workerProfileId);
    // Auth-gated and independent of the query above — the rest of the
    // section is public and must never wait on this one to render.
    const {data: eligibility} = useWorkerReviewEligibility(workerProfileId, isAuthenticated);

    if (isLoading) {
        return (
            <div className="space-y-4" role="status" aria-label="Loading reviews">
                <Skeleton className="h-8 w-40"/>
                <Skeleton className="h-24 w-full"/>
                <Skeleton className="h-16 w-full"/>
            </div>
        );
    }

    if (isError) {
        return (
            <p role="alert" className="text-sm text-muted-foreground">
                Couldn't load reviews right now. Please try again later.
            </p>
        );
    }

    const reviewCount = meta?.review_count ?? 0;
    const averageRating = meta?.average_rating !== null && meta?.average_rating !== undefined ? Number(meta.average_rating) : null;

    return (
        <section aria-labelledby="reviews-heading" className="space-y-6">
            <h2 id="reviews-heading" className="text-lg font-semibold">Reviews</h2>

            {/* Aggregate header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex items-center gap-2">
                    <RatingStars rating={averageRating ?? 0} size="lg"/>
                    <span className="text-2xl font-semibold">
                        {averageRating !== null ? averageRating.toFixed(1) : "—"}
                    </span>
                </div>
                <span className="text-sm text-muted-foreground">
                    {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </span>
            </div>

            {reviewCount > 0 && meta && (
                <RatingBreakdownChart breakdown={meta.rating_breakdown} totalCount={reviewCount}/>
            )}

            {eligibility?.can_review && eligibility.job_id !== null && (
                <div className="rounded-lg border border-dashed p-4 text-center">
                    <p className="mb-2 text-sm">Worked with this person? Leave a review</p>
                    <Button asChild size="sm">
                        <Link to={`/jobs/${eligibility.job_id}`}>Leave a review</Link>
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
        </section>
    );
};
