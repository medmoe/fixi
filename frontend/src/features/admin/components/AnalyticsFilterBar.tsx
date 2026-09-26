import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import type {AnalyticsDateRangeFilters} from "../types/analytics.types";

interface AnalyticsFilterBarProps {
    filters: AnalyticsDateRangeFilters;
    onChange: (partial: Partial<AnalyticsDateRangeFilters>) => void;
}

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({filters, onChange}) => {
    const {t} = useTranslation("admin");

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3" aria-label={t("analyticsFilterBar.ariaLabel")}>
            <Input
                type="date"
                className="sm:max-w-xs"
                aria-label={t("analyticsFilterBar.dateFromAriaLabel")}
                value={filters.date_from?.slice(0, 10) ?? ""}
                onChange={(e) => onChange({date_from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined})}
            />

            <Input
                type="date"
                className="sm:max-w-xs"
                aria-label={t("analyticsFilterBar.dateToAriaLabel")}
                value={filters.date_to?.slice(0, 10) ?? ""}
                onChange={(e) => onChange({date_to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined})}
            />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({date_from: undefined, date_to: undefined})}
            >
                {t("analyticsFilterBar.clearFilters")}
            </Button>
        </div>
    );
};
