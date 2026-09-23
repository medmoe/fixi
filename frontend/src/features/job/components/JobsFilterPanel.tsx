import React from "react";
import {useTranslation} from "react-i18next";
import {JobFilters, JobStatus} from "@/features/job";
import {useTrades} from "@/features/worker";
import {Badge} from "@/components/ui/badge.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select.tsx";

interface FilterPanelProps {
    filters: JobFilters;
    onChange: (partial: Partial<JobFilters>) => void;
}

const STATUS_VALUES: JobStatus[] = ["open", "assigned", "in_progress", "completed", "cancelled"];

export const JobsFilterPanel: React.FC<FilterPanelProps> = ({filters, onChange}) => {
    const {t} = useTranslation("job");
    const {data: tradeCategories = [], isLoading: categoriesLoading} = useTrades();

    const selectedIds = filters.trade_category_id !== undefined ? [filters.trade_category_id] : [];

    const toggleTradeCategory = (id: number) => {
        if (selectedIds.includes(id)) {
            onChange({trade_category_id: undefined});
        } else {
            onChange({trade_category_id: id});
        }
    };

    return (
        <div className="space-y-6" aria-label={t("jobsFilterPanel.ariaLabel")}>

            {/* Search */}
            <div className="space-y-2">
                <p className="text-sm font-medium">{t("jobsFilterPanel.searchLabel")}</p>
                <Input
                    aria-label={t("jobsFilterPanel.searchAriaLabel")}
                    placeholder={t("jobsFilterPanel.searchPlaceholder")}
                    value={filters.search ?? ""}
                    onChange={(e) => onChange({search: e.target.value || undefined})}
                />
            </div>

            {/* Status */}
            <div className="space-y-2">
                <p className="text-sm font-medium">{t("jobsFilterPanel.statusLabel")}</p>
                <Select
                    value={filters.status ?? "all"}
                    onValueChange={(value) =>
                        onChange({status: value === "all" ? undefined : (value as JobStatus)})
                    }
                >
                    <SelectTrigger aria-label={t("jobsFilterPanel.statusAriaLabel")}>
                        <SelectValue placeholder={t("jobsFilterPanel.allStatuses")}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t("jobsFilterPanel.allStatuses")}</SelectItem>
                        {STATUS_VALUES.map((value) => (
                            <SelectItem key={value} value={value}>
                                {t(`status.${value}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Trade category */}
            <div className="space-y-2">
                <p className="text-sm font-medium">{t("jobsFilterPanel.tradeCategoryLabel")}</p>
                {categoriesLoading ? (
                    <p className="text-xs text-muted-foreground animate-pulse">{t("jobsFilterPanel.loadingCategories")}</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tradeCategories.map((category) => (
                            <Badge
                                key={category.id}
                                role="checkbox"
                                variant={selectedIds.includes(category.id) ? "default" : "outline"}
                                className="cursor-pointer"
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
                                {category.display_name}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Budget range */}
            <div className="space-y-2">
                <p className="text-sm font-medium">{t("jobsFilterPanel.budgetRangeLabel")}</p>
                <div className="flex items-center gap-3">
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={t("shared.minimumBudgetAriaLabel")}
                        placeholder={t("jobsFilterPanel.minBudgetPlaceholder")}
                        value={filters.budget_min ?? ""}
                        onChange={(e) =>
                            onChange({
                                budget_min: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                        }
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={t("shared.maximumBudgetAriaLabel")}
                        placeholder={t("jobsFilterPanel.maxBudgetPlaceholder")}
                        value={filters.budget_max ?? ""}
                        onChange={(e) =>
                            onChange({
                                budget_max: e.target.value === "" ? undefined : Number(e.target.value),
                            })
                        }
                    />
                </div>
            </div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                    onChange({
                        search: undefined,
                        status: undefined,
                        trade_category_id: undefined,
                        budget_min: undefined,
                        budget_max: undefined,
                    })
                }
            >
                {t("jobsFilterPanel.clearFilters")}
            </Button>
        </div>
    );
};
