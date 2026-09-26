import React from "react";
import {useTranslation} from "react-i18next";
import {useFlaggedReviews} from "../hooks/useFlaggedReviews";
import {useKeepFlaggedReview} from "../hooks/useKeepFlaggedReview";
import {useRemoveFlaggedReview} from "../hooks/useRemoveFlaggedReview";
import {FlaggedReviewRow} from "../components/FlaggedReviewRow";

export const AdminFlaggedReviewsPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {data: reviews = [], isLoading, isError} = useFlaggedReviews();

    const keepMutation = useKeepFlaggedReview();
    const removeMutation = useRemoveFlaggedReview();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{t("flaggedReviews.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? t("flaggedReviews.loading") : t("flaggedReviews.pendingCount", {count: reviews.length})}
                </p>
            </div>

            {isError && <p className="text-sm text-destructive">{t("flaggedReviews.loadError")}</p>}

            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("flaggedReviews.loading")}</p>}

            {!isLoading && !isError && reviews.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("flaggedReviews.emptyState")}</p>
            )}

            {!isLoading && !isError && reviews.length > 0 && (
                <div className="bg-card border rounded-xl px-4">
                    {reviews.map((review) => (
                        <FlaggedReviewRow
                            key={review.id}
                            review={review}
                            onKeep={(id) => keepMutation.mutate(id)}
                            isKeeping={keepMutation.isPending && keepMutation.variables === review.id}
                            onRemove={(id) => removeMutation.mutate(id)}
                            isRemoving={removeMutation.isPending && removeMutation.variables === review.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
