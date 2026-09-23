import React from "react";
import {useTranslation} from "react-i18next";
import type {RatingBreakdown} from "../types";

const STAR_ROWS = [5, 4, 3, 2, 1] as const;

interface RatingBreakdownChartProps {
    breakdown: RatingBreakdown;
    totalCount: number;
}

export const RatingBreakdownChart: React.FC<RatingBreakdownChartProps> = ({breakdown, totalCount}) => {
    const {t} = useTranslation("review");

    return (
        <div className="space-y-1.5">
            {STAR_ROWS.map((star) => {
                const count = breakdown[star];
                const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                const starLabel = t("shared.starCount", {count: star});
                const reviewLabel = t("shared.reviewCount", {count});
                const label = t("ratingBreakdownChart.ariaLabel", {starLabel, percent, reviewLabel});

                return (
                    <div key={star} className="flex items-center gap-2 text-xs">
                        <span className="w-10 shrink-0 text-muted-foreground">
                            {starLabel}
                        </span>
                        <div
                            role="img"
                            aria-label={label}
                            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                        >
                            <div className="h-full rounded-full bg-yellow-400" style={{width: `${percent}%`}}/>
                        </div>
                        <span className="w-9 shrink-0 text-right text-muted-foreground">{percent}%</span>
                    </div>
                );
            })}
        </div>
    );
};
