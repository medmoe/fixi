import React from "react";
import {useTranslation} from "react-i18next";
import {Badge} from "@/components/ui/badge";

interface WorkerBillingStatusBadgeProps {
    status: "pending" | "paid" | "overdue";
    isOverdue: boolean;
}

export const WorkerBillingStatusBadge: React.FC<WorkerBillingStatusBadgeProps> = ({status, isOverdue}) => {
    const {t} = useTranslation("admin");

    if (status === "paid") {
        return <Badge variant="secondary">{t("billingStatus.paid")}</Badge>;
    }
    if (isOverdue) {
        return <Badge variant="destructive">{t("billingStatus.overdue")}</Badge>;
    }
    return <Badge variant="outline">{t("billingStatus.pending")}</Badge>;
};
