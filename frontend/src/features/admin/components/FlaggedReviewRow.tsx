import React from "react";
import {useTranslation} from "react-i18next";
import {Flag, Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {RatingStars} from "@/features/review";
import {useFormatDate} from "@/lib/hooks/useFormatters";
import type {FlaggedReviewRead} from "../types/flaggedReview.types";
import {RemoveFlaggedReviewDialog} from "./RemoveFlaggedReviewDialog";

interface FlaggedReviewRowProps {
    review: FlaggedReviewRead;
    onKeep: (reviewId: number) => void;
    isKeeping: boolean;
    onRemove: (reviewId: number) => void;
    isRemoving: boolean;
}

export const FlaggedReviewRow: React.FC<FlaggedReviewRowProps> = ({review, onKeep, isKeeping, onRemove, isRemoving}) => {
    const {t} = useTranslation("admin");
    const formatDate = useFormatDate();
    const isBusy = isKeeping || isRemoving;

    return (
        <div data-testid="flagged-review-row" className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b py-4 last:border-0">
            <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <RatingStars rating={review.rating}/>
                    <span className="sr-only">{t("flaggedReviews.ratingLabel", {rating: review.rating})}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-xs font-medium">
                        <Flag className="h-3 w-3"/>
                        {t("flaggedReviews.reportCount", {count: review.report_count})}
                    </span>
                </div>
                <p className="text-sm">
                    {review.comment
                        ? <span className="whitespace-pre-line break-words">{review.comment}</span>
                        : <span className="italic text-muted-foreground">{t("flaggedReviews.noComment")}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                    {t("flaggedReviews.byline", {reviewer: review.reviewer_name, reviewee: review.reviewee_name, date: formatDate(review.created_at)})}
                </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={() => onKeep(review.id)} disabled={isBusy}>
                    {isKeeping && <Loader2 className="h-4 w-4 animate-spin"/>}
                    {t("flaggedReviews.keepButton")}
                </Button>
                <RemoveFlaggedReviewDialog isPending={isRemoving} disabled={isBusy} onConfirm={() => onRemove(review.id)}/>
            </div>
        </div>
    );
};
