import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Download, Loader2} from "lucide-react";
import type {WorkerBillingAdminRead} from "../types/workerBilling.types";
import {WorkerBillingStatusBadge} from "./WorkerBillingStatusBadge";

interface WorkerBillingTableProps {
    records: WorkerBillingAdminRead[];
    onMarkPaid: (id: number) => void;
    markingPaidId?: number;
    onDownloadInvoice: (id: number) => void;
    downloadingInvoiceId?: number;
}

export const WorkerBillingTable: React.FC<WorkerBillingTableProps> = ({records, onMarkPaid, markingPaidId, onDownloadInvoice, downloadingInvoiceId}) => {
    const {t} = useTranslation("admin");

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
            <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 pe-4 font-medium text-start">{t("billingTable.worker")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("billingTable.amountOwed")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("billingTable.amountPaid")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("billingTable.dueDate")}</th>
                <th className="py-2 pe-4 font-medium text-start">{t("billingTable.status")}</th>
                <th className="py-2 pe-4 font-medium text-start"/>
            </tr>
            </thead>
            <tbody>
            {records.map((record) => (
                <tr key={record.id} data-testid="worker-billing-row" className="border-b last:border-0">
                    <td className="py-2 pe-4">
                        <div>{record.worker_name}</div>
                        <div className="text-muted-foreground">{record.worker_email}</div>
                    </td>
                    <td className="py-2 pe-4">{record.amount_owed}</td>
                    <td className="py-2 pe-4">{record.amount_paid}</td>
                    <td className="py-2 pe-4">{new Date(record.due_date).toLocaleDateString()}</td>
                    <td className="py-2 pe-4">
                        <WorkerBillingStatusBadge status={record.status} isOverdue={record.is_overdue}/>
                    </td>
                    <td className="py-2 pe-4 text-end space-x-2 rtl:space-x-reverse whitespace-nowrap">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onDownloadInvoice(record.id)}
                            disabled={downloadingInvoiceId === record.id}
                            aria-label={t("billingTable.downloadInvoiceAriaLabel", {name: record.worker_name, id: record.job_id})}
                        >
                            {downloadingInvoiceId === record.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                            <span className="ms-1">{t("billingTable.invoiceButton")}</span>
                        </Button>
                        {record.status !== "paid" && (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onMarkPaid(record.id)}
                                disabled={markingPaidId === record.id}
                            >
                                {markingPaidId === record.id && <Loader2 className="me-2 h-4 w-4 animate-spin"/>}
                                {t("billingTable.markPaidButton")}
                            </Button>
                        )}
                    </td>
                </tr>
            ))}
            </tbody>
        </table>
    );
};
