import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import {useWorkerBillingDashboard} from "../hooks/useWorkerBillingDashboard";
import {useMarkWorkerBillingPaid} from "../hooks/useMarkWorkerBillingPaid";
import {useExportWorkerBillingCsv} from "../hooks/useExportWorkerBillingCsv";
import {WorkerBillingFilterBar} from "../components/WorkerBillingFilterBar";
import {WorkerBillingTable} from "../components/WorkerBillingTable";
import {useDownloadInvoice} from "@/features/worker";

export const AdminBillingDashboardPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {filters, updateFilters, records, isLoading, isError} = useWorkerBillingDashboard();
    const markPaidMutation = useMarkWorkerBillingPaid();
    const downloadInvoice = useDownloadInvoice();
    const exportMutation = useExportWorkerBillingCsv();

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold">{t("billingDashboard.title")}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isLoading ? t("billingDashboard.loading") : t("billingDashboard.recordsFoundCount", {count: records.length})}
                    </p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => exportMutation.mutate(filters)}
                    disabled={exportMutation.isPending}
                >
                    {exportMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                    {t("billingDashboard.exportButton")}
                </Button>
            </div>

            <WorkerBillingFilterBar filters={filters} onChange={updateFilters}/>

            {isError && <p className="text-sm text-destructive">{t("billingDashboard.loadError")}</p>}

            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("billingDashboard.loading")}</p>}

            {!isLoading && !isError && records.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("billingDashboard.emptyState")}</p>
            )}

            {!isLoading && !isError && records.length > 0 && (
                <WorkerBillingTable
                    records={records}
                    onMarkPaid={(id) => markPaidMutation.mutate(id)}
                    markingPaidId={markPaidMutation.isPending ? markPaidMutation.variables : undefined}
                    onDownloadInvoice={(id) => downloadInvoice.mutate(id)}
                    downloadingInvoiceId={downloadInvoice.isPending ? downloadInvoice.variables : undefined}
                />
            )}
        </div>
    );
};
