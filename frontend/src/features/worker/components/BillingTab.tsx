import React from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {Download, Loader2, Receipt} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {useFormatCurrency, useFormatDate} from "@/lib/hooks/useFormatters";
import {useDownloadInvoice, useMyBilling} from "../hooks";
import type {WorkerBillingRead} from "../types";

const BillingStatusBadge: React.FC<{record: WorkerBillingRead}> = ({record}) => {
    const {t} = useTranslation("worker");
    if (record.status === "paid") return <Badge variant="secondary">{t("billingTab.status.paid")}</Badge>;
    if (record.is_overdue) return <Badge variant="destructive">{t("billingTab.status.overdue")}</Badge>;
    return <Badge variant="outline">{t("billingTab.status.pending")}</Badge>;
};

/** Worker's own commission history (read-only -- commission is settled in cash with an admin). */
export const BillingTab: React.FC = () => {
    const {t} = useTranslation("worker");
    const formatCurrency = useFormatCurrency();
    const formatDate = useFormatDate();
    const {data: records = [], isLoading, isError} = useMyBilling();
    const downloadInvoice = useDownloadInvoice();

    const outstanding = records
        .filter((r) => r.status !== "paid")
        .reduce((sum, r) => sum + Number(r.amount_owed) - Number(r.amount_paid), 0);
    const overdueCount = records.filter((r) => r.status !== "paid" && r.is_overdue).length;

    if (isLoading) {
        return (
            <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-28 w-full"/>
                <Skeleton className="h-48 w-full"/>
            </div>
        );
    }

    if (isError) {
        return <p className="text-sm text-destructive">{t("billingTab.loadError")}</p>;
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5"/>
                        {t("billingTab.outstandingTitle")}
                    </CardTitle>
                    <CardDescription>{t("billingTab.outstandingDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                    <p data-testid="billing-outstanding" className="text-3xl font-bold">{formatCurrency(outstanding)}</p>
                    {overdueCount > 0 && (
                        <p className="text-sm text-destructive">{t("billingTab.overdueCount", {count: overdueCount})}</p>
                    )}
                </CardContent>
            </Card>

            {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("billingTab.emptyState")}</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                        <tr className="border-b text-muted-foreground">
                            <th className="py-2 px-3 font-medium text-start">{t("billingTab.columns.job")}</th>
                            <th className="py-2 px-3 font-medium text-start">{t("billingTab.columns.amountOwed")}</th>
                            <th className="py-2 px-3 font-medium text-start">{t("billingTab.columns.dueDate")}</th>
                            <th className="py-2 px-3 font-medium text-start">{t("billingTab.columns.status")}</th>
                            <th className="py-2 px-3"><span className="sr-only">{t("billingTab.columns.invoice")}</span></th>
                        </tr>
                        </thead>
                        <tbody>
                        {records.map((record) => {
                            const isDownloading = downloadInvoice.isPending && downloadInvoice.variables === record.id;
                            return (
                                <tr key={record.id} data-testid="billing-row" className="border-b last:border-0">
                                    <td className="py-2 px-3">
                                        <Link to={`/jobs/${record.job_id}`} className="underline-offset-4 hover:underline">
                                            {t("billingTab.jobLink", {id: record.job_id})}
                                        </Link>
                                    </td>
                                    <td className="py-2 px-3">{formatCurrency(Number(record.amount_owed))}</td>
                                    <td className="py-2 px-3">{formatDate(record.due_date)}</td>
                                    <td className="py-2 px-3"><BillingStatusBadge record={record}/></td>
                                    <td className="py-2 px-3 text-end">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => downloadInvoice.mutate(record.id)}
                                            disabled={isDownloading}
                                            aria-label={t("billingTab.downloadInvoiceAriaLabel", {id: record.job_id})}
                                        >
                                            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                                            <span className="hidden sm:inline ms-1">{t("billingTab.invoice")}</span>
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
