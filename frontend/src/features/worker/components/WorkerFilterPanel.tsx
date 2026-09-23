import React from "react";
import {useQuery} from "@tanstack/react-query";
import {useTranslation} from "react-i18next";
import {workerApi} from "@/lib";
import {useLocalizedTradeName} from "@/features/worker/hooks/useLocalizedTradeName";
import {Checkbox} from "@/components/ui/checkbox";
import {Switch} from "@/components/ui/switch";
import {Slider} from "@/components/ui/slider";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {useFormatCurrency} from "@/lib/hooks/useFormatters";
import type {WorkerSearchFilters} from "../types";

interface FilterPanelProps {
    filters: WorkerSearchFilters;
    onChange: (partial: Partial<WorkerSearchFilters>) => void;
}

const MAX_HOURLY_RATE = 500;
const MAX_RADIUS_KM = 200;

export const WorkerFilterPanel: React.FC<FilterPanelProps> = ({filters, onChange}) => {
    const {t} = useTranslation("worker");
    const formatCurrency = useFormatCurrency();
    const getTradeName = useLocalizedTradeName();
    const {data: tradeCategories = [], isLoading: categoriesLoading} = useQuery({
        queryKey: ["trade-categories"],
        queryFn: workerApi.getTrades,
    });

    // NOTE: UI supports multi-select visually, but the backend currently only
    // accepts a single trade_category_id. Selecting a category here only
    // sends the first one to the API — see #84 follow-up for backend support
    // of trade_category_ids: list[int].
    const selectedIds = filters.trade_category_id !== undefined ? [filters.trade_category_id] : [];

    const toggleTradeCategory = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange({trade_category_id: undefined});
        } else {
            onChange({trade_category_id: id});
        }
    };

    return (
        <div className="space-y-6" aria-label={t("workerFilterPanel.ariaLabel")}>

            {/* Trade category multi-select */}
            <div className="space-y-2">
                <p className="text-sm font-medium">{t("workerFilterPanel.tradeCategoryLabel")}</p>
                {categoriesLoading ? (
                    <p className="text-xs text-muted-foreground animate-pulse">{t("workerFilterPanel.loadingCategories")}</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tradeCategories.map((category) => (
                            <Badge
                                key={category.id}
                                variant={selectedIds.includes(category.id) ? "default" : "outline"}
                                className="cursor-pointer"
                                role="checkbox"
                                aria-checked={selectedIds.includes(category.id)}
                                tabIndex={0}
                                onClick={() => toggleTradeCategory(category.id)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        toggleTradeCategory(category.id);
                                    }
                                }}
                            >
                                {getTradeName(category)}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Hourly rate range slider */}
            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {t("workerFilterPanel.hourlyRateRange", {
                        min: formatCurrency(filters.min_hourly_rate ?? 0),
                        max: formatCurrency(filters.max_hourly_rate ?? MAX_HOURLY_RATE),
                    })}
                </p>
                <Slider
                    aria-label={t("workerFilterPanel.hourlyRateRangeAriaLabel")}
                    min={0}
                    max={MAX_HOURLY_RATE}
                    step={5}
                    value={[filters.min_hourly_rate ?? 0, filters.max_hourly_rate ?? MAX_HOURLY_RATE]}
                    onValueChange={([min, max]) =>
                        onChange({min_hourly_rate: min, max_hourly_rate: max})
                    }
                />
            </div>

            {/* Service radius slider */}
            <div className="space-y-2">
                <p className="text-sm font-medium">
                    {t("workerFilterPanel.serviceRadiusRange", {radius: filters.service_radius_km ?? MAX_RADIUS_KM})}
                </p>
                <Slider
                    aria-label={t("shared.serviceRadius")}
                    min={1}
                    max={MAX_RADIUS_KM}
                    step={5}
                    value={[filters.service_radius_km ?? MAX_RADIUS_KM]}
                    onValueChange={([value]) => onChange({service_radius_km: value})}
                />
            </div>

            {/* Availability toggle */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("shared.availableNow")}</p>
                <Switch
                    aria-label={t("shared.availableNow")}
                    checked={filters.is_available ?? false}
                    onCheckedChange={(checked) =>
                        onChange({is_available: checked ? true : undefined})
                    }
                />
            </div>

            {/* Verified only checkbox */}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="verified-only"
                    aria-label={t("workerFilterPanel.verifiedOnly")}
                    checked={filters.is_verified ?? false}
                    onCheckedChange={(checked) =>
                        onChange({is_verified: checked === true ? true : undefined})
                    }
                />
                <label htmlFor="verified-only" className="text-sm font-medium cursor-pointer">
                    {t("workerFilterPanel.verifiedOnly")}
                </label>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                    onChange({
                        trade_category_id: undefined,
                        min_hourly_rate: undefined,
                        max_hourly_rate: undefined,
                        service_radius_km: undefined,
                        is_available: undefined,
                        is_verified: undefined,
                    })
                }
            >
                {t("workerFilterPanel.clearFilters")}
            </Button>
        </div>
    );
};
