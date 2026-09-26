import React from "react";
import {useTranslation} from "react-i18next";
import {useAnalyticsDashboard} from "../hooks/useAnalyticsDashboard";
import {useLocalizedTradeName} from "@/features/worker/hooks/useLocalizedTradeName";
import {AnalyticsFilterBar} from "../components/AnalyticsFilterBar";
import {AnalyticsOverviewCards} from "../components/AnalyticsOverviewCards";
import {DailyTrendChart} from "../components/DailyTrendChart";
import {AnalyticsBreakdownList} from "../components/AnalyticsBreakdownList";
import {ConversionFunnelChart} from "../components/ConversionFunnelChart";

export const AdminAnalyticsPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {filters, updateFilters, overview, breakdown, funnel, isLoading, isError} = useAnalyticsDashboard();
    const localizeTradeName = useLocalizedTradeName();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{t("analyticsPage.title")}</h1>
            </div>

            <AnalyticsFilterBar filters={filters} onChange={updateFilters}/>

            {isError && <p className="text-sm text-destructive">{t("analyticsPage.loadError")}</p>}

            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("analyticsPage.loading")}</p>}

            {!isLoading && !isError && overview && (
                <>
                    <AnalyticsOverviewCards overview={overview}/>

                    <div className="bg-card border rounded-xl p-4 space-y-3">
                        <h2 className="text-sm font-medium">{t("analyticsOverview.dailyTrendHeading")}</h2>
                        <DailyTrendChart daily={overview.daily}/>
                    </div>
                </>
            )}

            {!isLoading && !isError && funnel && (
                <div className="bg-card border rounded-xl p-4 space-y-3">
                    <h2 className="text-sm font-medium">{t("analyticsFunnel.heading")}</h2>
                    <ConversionFunnelChart funnel={funnel}/>
                </div>
            )}

            {!isLoading && !isError && breakdown && (
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-card border rounded-xl p-4 space-y-3">
                        <h2 className="text-sm font-medium">{t("analyticsBreakdown.byTradeCategoryHeading")}</h2>
                        <AnalyticsBreakdownList
                            emptyLabel={t("analyticsBreakdown.emptyState")}
                            rows={breakdown.by_trade_category.map((item) => ({
                                label: item.trade_category_id === null
                                    ? t("analyticsBreakdown.uncategorized")
                                    : localizeTradeName(item),
                                count: item.job_count,
                            }))}
                        />
                    </div>

                    <div className="bg-card border rounded-xl p-4 space-y-3">
                        <h2 className="text-sm font-medium">{t("analyticsBreakdown.byLocationHeading")}</h2>
                        <AnalyticsBreakdownList
                            emptyLabel={t("analyticsBreakdown.emptyState")}
                            rows={breakdown.by_location.map((item) => ({label: item.location, count: item.job_count}))}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
