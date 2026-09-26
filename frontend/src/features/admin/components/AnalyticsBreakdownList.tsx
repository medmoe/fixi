import React from "react";
import {useTranslation} from "react-i18next";

interface BreakdownRow {
    label: string;
    count: number;
}

interface AnalyticsBreakdownListProps {
    rows: BreakdownRow[];
    emptyLabel: string;
}

export const AnalyticsBreakdownList: React.FC<AnalyticsBreakdownListProps> = ({rows, emptyLabel}) => {
    const {t} = useTranslation("admin");

    if (rows.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
    }

    const maxCount = Math.max(...rows.map((row) => row.count), 1);

    return (
        <div className="space-y-1.5">
            {rows.map((row) => {
                const percent = Math.round((row.count / maxCount) * 100);
                const label = t("analyticsBreakdown.rowAriaLabel", {label: row.label, count: row.count});
                return (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 truncate text-muted-foreground">{row.label}</span>
                        <div role="img" aria-label={label} className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{width: `${percent}%`}}/>
                        </div>
                        <span className="w-8 shrink-0 text-end text-muted-foreground">{row.count}</span>
                    </div>
                );
            })}
        </div>
    );
};
