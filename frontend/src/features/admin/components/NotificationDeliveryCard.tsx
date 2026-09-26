import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {AlertTriangle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useFormatNumber} from "@/lib/hooks/useFormatters";
import {cn} from "@/lib/utils";
import {useNotificationDeliveryStats} from "../hooks/useNotificationDeliveryStats";

/** Rows failing more often than this are highlighted. */
export const FAILURE_RATE_ALERT_THRESHOLD = 0.05;

const WINDOWS = [
    {hours: 24, labelKey: "notificationDelivery.window24h"},
    {hours: 24 * 7, labelKey: "notificationDelivery.window7d"},
] as const;

export const NotificationDeliveryCard: React.FC = () => {
    const {t} = useTranslation("admin");
    const formatNumber = useFormatNumber();
    const [sinceHours, setSinceHours] = useState<number>(WINDOWS[0].hours);
    const {data: rows = [], isLoading, isError} = useNotificationDeliveryStats(sinceHours);

    const formatRate = (rate: number) => formatNumber(rate, {style: "percent", maximumFractionDigits: 1});

    return (
        <section aria-labelledby="notification-delivery-heading" className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 id="notification-delivery-heading" className="text-sm font-medium">{t("notificationDelivery.heading")}</h2>
                    <p className="text-xs text-muted-foreground">{t("notificationDelivery.description", {threshold: formatRate(FAILURE_RATE_ALERT_THRESHOLD)})}</p>
                </div>
                <div role="group" aria-label={t("notificationDelivery.windowAriaLabel")} className="flex gap-1">
                    {WINDOWS.map((w) => (
                        <Button
                            key={w.hours}
                            type="button"
                            size="sm"
                            variant={sinceHours === w.hours ? "default" : "outline"}
                            aria-pressed={sinceHours === w.hours}
                            onClick={() => setSinceHours(w.hours)}
                        >
                            {t(w.labelKey)}
                        </Button>
                    ))}
                </div>
            </div>

            {isError && <p className="text-sm text-destructive">{t("notificationDelivery.loadError")}</p>}
            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("notificationDelivery.loading")}</p>}
            {!isLoading && !isError && rows.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("notificationDelivery.emptyState")}</p>
            )}

            {!isLoading && !isError && rows.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                        <tr className="border-b text-muted-foreground">
                            <th className="py-2 pe-4 font-medium text-start">{t("notificationDelivery.columns.channel")}</th>
                            <th className="py-2 pe-4 font-medium text-start">{t("notificationDelivery.columns.provider")}</th>
                            <th className="py-2 pe-4 font-medium text-end">{t("notificationDelivery.columns.sent")}</th>
                            <th className="py-2 pe-4 font-medium text-end">{t("notificationDelivery.columns.failed")}</th>
                            <th className="py-2 pe-4 font-medium text-end">{t("notificationDelivery.columns.skipped")}</th>
                            <th className="py-2 font-medium text-end">{t("notificationDelivery.columns.failureRate")}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.map((row) => {
                            const isAlert = row.failure_rate !== null && row.failure_rate > FAILURE_RATE_ALERT_THRESHOLD;
                            return (
                                <tr
                                    key={`${row.channel}-${row.provider}`}
                                    data-testid="notification-delivery-row"
                                    data-alert={isAlert || undefined}
                                    className={cn("border-b last:border-0", isAlert && "bg-destructive/5")}
                                >
                                    <td className="py-2 pe-4">{t(`notificationDelivery.channels.${row.channel}`)}</td>
                                    <td className="py-2 pe-4 text-muted-foreground">{row.provider}</td>
                                    <td className="py-2 pe-4 text-end">{formatNumber(row.sent)}</td>
                                    <td className="py-2 pe-4 text-end">{formatNumber(row.failed)}</td>
                                    <td className="py-2 pe-4 text-end text-muted-foreground">{formatNumber(row.skipped)}</td>
                                    <td className={cn("py-2 text-end font-medium", isAlert && "text-destructive")}>
                                        {row.failure_rate === null ? (
                                            <span className="text-muted-foreground font-normal">{t("notificationDelivery.noData")}</span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1">
                                                {isAlert && <AlertTriangle className="h-3.5 w-3.5" aria-label={t("notificationDelivery.alertAriaLabel")}/>}
                                                {formatRate(row.failure_rate)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};
