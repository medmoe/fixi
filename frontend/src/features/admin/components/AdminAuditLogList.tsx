import React from "react";
import {useTranslation} from "react-i18next";
import type {AdminActionLogRead} from "../types/adminUser.types";

interface AdminAuditLogListProps {
    entries: AdminActionLogRead[];
}

export const AdminAuditLogList: React.FC<AdminAuditLogListProps> = ({entries}) => {
    const {t} = useTranslation("admin");

    if (entries.length === 0) {
        return <p className="text-sm text-muted-foreground">{t("detail.noAuditLogEntries")}</p>;
    }

    return (
        <ul className="space-y-3">
            {entries.map((entry) => (
                <li key={entry.id} data-testid="audit-log-entry" className="border-b pb-3 last:border-0 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="font-medium">{t(`auditActions.${entry.action}`)}</span>
                        <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</span>
                    </div>
                    {entry.reason && <p className="text-muted-foreground mt-1">{entry.reason}</p>}
                </li>
            ))}
        </ul>
    );
};
