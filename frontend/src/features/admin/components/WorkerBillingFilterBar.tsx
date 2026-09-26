import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {WorkerBillingAdminFilters} from "../types/workerBilling.types";

interface WorkerBillingFilterBarProps {
    filters: WorkerBillingAdminFilters;
    onChange: (partial: Partial<WorkerBillingAdminFilters>) => void;
}

export const WorkerBillingFilterBar: React.FC<WorkerBillingFilterBarProps> = ({filters, onChange}) => {
    const {t} = useTranslation("admin");

    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3" aria-label={t("billingFilterBar.ariaLabel")}>
            <Select
                value={filters.status ?? "all"}
                onValueChange={(value) =>
                    onChange({status: value === "all" ? undefined : (value as WorkerBillingAdminFilters["status"])})
                }
            >
                <SelectTrigger className="sm:max-w-xs" aria-label={t("billingFilterBar.statusAriaLabel")}>
                    <SelectValue placeholder={t("billingFilterBar.allStatuses")}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("billingFilterBar.allStatuses")}</SelectItem>
                    <SelectItem value="pending">{t("billingStatus.pending")}</SelectItem>
                    <SelectItem value="paid">{t("billingStatus.paid")}</SelectItem>
                    <SelectItem value="overdue">{t("billingStatus.overdue")}</SelectItem>
                </SelectContent>
            </Select>

            <Input
                type="date"
                className="sm:max-w-xs"
                aria-label={t("billingFilterBar.dueDateFromAriaLabel")}
                value={filters.due_date_from?.slice(0, 10) ?? ""}
                onChange={(e) => onChange({due_date_from: e.target.value ? `${e.target.value}T00:00:00Z` : undefined})}
            />

            <Input
                type="date"
                className="sm:max-w-xs"
                aria-label={t("billingFilterBar.dueDateToAriaLabel")}
                value={filters.due_date_to?.slice(0, 10) ?? ""}
                onChange={(e) => onChange({due_date_to: e.target.value ? `${e.target.value}T23:59:59Z` : undefined})}
            />

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({status: undefined, due_date_from: undefined, due_date_to: undefined})}
            >
                {t("billingFilterBar.clearFilters")}
            </Button>
        </div>
    );
};
