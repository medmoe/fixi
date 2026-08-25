import React from "react";
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

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
    {value: "open", label: "Open"},
    {value: "assigned", label: "Assigned"},
    {value: "in_progress", label: "In Progress"},
    {value: "completed", label: "Completed"},
    {value: "cancelled", label: "Cancelled"},
];

export const JobsFilterPanel: React.FC<FilterPanelProps> = ({filters, onChange}) => {
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
        <div className="space-y-6" aria-label="Job filters">

            {/* Search */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Search</p>
                <Input
                    aria-label="Search jobs"
                    placeholder="e.g. Fix leaking sink"
                    value={filters.search ?? ""}
                    onChange={(e) => onChange({search: e.target.value || undefined})}
                />
            </div>

            {/* Status */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <Select
                    value={filters.status ?? "all"}
                    onValueChange={(value) =>
                        onChange({status: value === "all" ? undefined : (value as JobStatus)})
                    }
                >
                    <SelectTrigger aria-label="Job status">
                        <SelectValue placeholder="All statuses"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {STATUS_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Trade category */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Trade Category</p>
                {categoriesLoading ? (
                    <p className="text-xs text-muted-foreground animate-pulse">Loading categories...</p>
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
                <p className="text-sm font-medium">Budget Range</p>
                <div className="flex items-center gap-3">
                    <Input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label="Minimum budget"
                        placeholder="Min"
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
                        aria-label="Maximum budget"
                        placeholder="Max"
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
                Clear filters
            </Button>
        </div>
    );
};