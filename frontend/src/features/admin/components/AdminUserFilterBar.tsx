import React from "react";
import {useTranslation} from "react-i18next";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import type {AdminUserFilters} from "../types/adminUser.types";

interface AdminUserFilterBarProps {
    filters: AdminUserFilters;
    onChange: (partial: Partial<AdminUserFilters>) => void;
}

export const AdminUserFilterBar: React.FC<AdminUserFilterBarProps> = ({filters, onChange}) => {
    const {t} = useTranslation("admin");

    return (
        <div className="flex flex-col sm:flex-row gap-3" aria-label={t("filterBar.ariaLabel")}>
            <Input
                className="sm:max-w-xs"
                aria-label={t("filterBar.searchAriaLabel")}
                placeholder={t("filterBar.searchPlaceholder")}
                value={filters.search ?? ""}
                onChange={(e) => onChange({search: e.target.value || undefined})}
            />

            <Select
                value={filters.role_type ?? "all"}
                onValueChange={(value) => onChange({role_type: value === "all" ? undefined : (value as "customer" | "worker")})}
            >
                <SelectTrigger aria-label={t("filterBar.roleAriaLabel")}>
                    <SelectValue placeholder={t("filterBar.allRoles")}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filterBar.allRoles")}</SelectItem>
                    <SelectItem value="customer">{t("role.customer")}</SelectItem>
                    <SelectItem value="worker">{t("role.worker")}</SelectItem>
                </SelectContent>
            </Select>

            <Select
                value={filters.is_suspended === undefined ? "all" : filters.is_suspended ? "suspended" : "active"}
                onValueChange={(value) =>
                    onChange({is_suspended: value === "all" ? undefined : value === "suspended"})
                }
            >
                <SelectTrigger aria-label={t("filterBar.statusAriaLabel")}>
                    <SelectValue placeholder={t("filterBar.allStatuses")}/>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("filterBar.allStatuses")}</SelectItem>
                    <SelectItem value="active">{t("status.active")}</SelectItem>
                    <SelectItem value="suspended">{t("status.suspended")}</SelectItem>
                </SelectContent>
            </Select>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({search: undefined, role_type: undefined, is_suspended: undefined})}
            >
                {t("filterBar.clearFilters")}
            </Button>
        </div>
    );
};
