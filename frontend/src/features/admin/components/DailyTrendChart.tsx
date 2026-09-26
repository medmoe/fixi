import React from "react";
import {useTranslation} from "react-i18next";
import type {DailyMetricPoint} from "../types/analytics.types";

interface DailyTrendChartProps {
    daily: DailyMetricPoint[];
}

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({daily}) => {
    const {t} = useTranslation("admin");

    if (daily.length === 0) {
        return <p className="text-sm text-muted-foreground">{t("analyticsOverview.noDailyData")}</p>;
    }

    const maxValue = Math.max(...daily.map((point) => point.jobs_posted), 1);

    return (
        <div className="flex items-end gap-1 h-32" aria-label={t("analyticsOverview.dailyChartAriaLabel")}>
            {daily.map((point) => {
                const heightPercent = Math.round((point.jobs_posted / maxValue) * 100);
                const label = t("analyticsOverview.dailyBarAriaLabel", {date: point.date, count: point.jobs_posted});
                return (
                    <div
                        key={point.date}
                        role="img"
                        aria-label={label}
                        title={label}
                        className="flex-1 bg-primary/70 rounded-t min-w-[2px]"
                        style={{height: `${Math.max(heightPercent, 2)}%`}}
                    />
                );
            })}
        </div>
    );
};
