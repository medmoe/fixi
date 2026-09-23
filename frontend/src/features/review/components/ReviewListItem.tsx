import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {cn} from "@/lib/utils";
import {RatingStars} from "./RatingStars";
import {useFormatRelativeDate} from "../hooks/useFormatRelativeDate";
import type {ReviewPublicRead} from "../types";

// jsdom doesn't compute real layout (scrollHeight/clientHeight are always 0),
// so detecting actual 3-line overflow isn't reliably testable. A character
// count is an approximation of "roughly 3 lines" at typical card widths,
// but it keeps the "Show more" toggle's presence deterministic and testable.
const LIKELY_OVERFLOW_THRESHOLD = 180;

interface ReviewListItemProps {
    review: ReviewPublicRead;
}

export const ReviewListItem: React.FC<ReviewListItemProps> = ({review}) => {
    const {t} = useTranslation("review");
    const [expanded, setExpanded] = useState(false);
    const formatRelativeDate = useFormatRelativeDate();
    const isLong = (review.comment?.length ?? 0) > LIKELY_OVERFLOW_THRESHOLD;

    return (
        <article className="space-y-1.5 border-b pb-4 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{review.reviewer_display_name}</span>
                <span className="text-xs text-muted-foreground">{formatRelativeDate(review.created_at)}</span>
            </div>

            <RatingStars rating={review.rating}/>

            {review.comment && (
                <div>
                    <p className={cn("text-sm text-muted-foreground whitespace-pre-wrap", !expanded && "line-clamp-3")}>
                        {review.comment}
                    </p>
                    {isLong && (
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            className="mt-1 text-xs font-medium text-primary hover:underline"
                        >
                            {expanded ? t("reviewListItem.showLess") : t("reviewListItem.showMore")}
                        </button>
                    )}
                </div>
            )}
        </article>
    );
};
