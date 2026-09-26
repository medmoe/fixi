import React from "react";
import {useTranslation} from "react-i18next";
import type {PlatformOverviewRead} from "../types/analytics.types";

interface AnalyticsOverviewCardsProps {
    overview: PlatformOverviewRead;
}

export const AnalyticsOverviewCards: React.FC<AnalyticsOverviewCardsProps> = ({overview}) => {
    const {t} = useTranslation("admin");

    const cards = [
        {label: t("analyticsOverview.jobsPosted"), value: overview.jobs_posted},
        {label: t("analyticsOverview.applicationsSubmitted"), value: overview.applications_submitted},
        {label: t("analyticsOverview.acceptanceRate"), value: `${Math.round(overview.acceptance_rate * 100)}%`},
        {label: t("analyticsOverview.completionRate"), value: `${Math.round(overview.completion_rate * 100)}%`},
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cards.map((card) => (
                <div key={card.label} className="bg-card border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground">{card.label}</div>
                    <div className="text-2xl font-semibold mt-1">{card.value}</div>
                </div>
            ))}
        </div>
    );
};
