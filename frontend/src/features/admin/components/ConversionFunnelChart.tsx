import React from "react";
import {useTranslation} from "react-i18next";
import type {ConversionFunnelRead} from "../types/analytics.types";

interface ConversionFunnelChartProps {
    funnel: ConversionFunnelRead;
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({funnel}) => {
    const {t} = useTranslation("admin");

    const stages = [
        {label: t("analyticsFunnel.posted"), value: funnel.posted},
        {label: t("analyticsFunnel.applied"), value: funnel.applied},
        {label: t("analyticsFunnel.accepted"), value: funnel.accepted},
        {label: t("analyticsFunnel.completed"), value: funnel.completed},
    ];
    const maxValue = Math.max(funnel.posted, 1);

    return (
        <div className="space-y-2">
            {stages.map((stage) => {
                const percent = Math.round((stage.value / maxValue) * 100);
                const label = t("analyticsFunnel.stageAriaLabel", {label: stage.label, count: stage.value, percent});
                return (
                    <div key={stage.label} className="flex items-center gap-2 text-sm">
                        <span className="w-24 shrink-0 text-muted-foreground">{stage.label}</span>
                        <div role="img" aria-label={label} className="h-4 flex-1 overflow-hidden rounded bg-muted">
                            <div className="h-full rounded bg-primary" style={{width: `${percent}%`}}/>
                        </div>
                        <span className="w-10 shrink-0 text-end">{stage.value}</span>
                    </div>
                );
            })}
        </div>
    );
};
