import React from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {FileText, Loader2} from "lucide-react";
import type {WorkerVerificationQueueRead} from "../types/workerVerification.types";
import {RejectVerificationDialog} from "./RejectVerificationDialog";

interface WorkerVerificationRowProps {
    entry: WorkerVerificationQueueRead;
    onViewDocument: (workerProfileId: number) => void;
    isLoadingDocument: boolean;
    onApprove: (workerProfileId: number) => void;
    isApproving: boolean;
    onReject: (workerProfileId: number, reason: string) => void;
    isRejecting: boolean;
}

export const WorkerVerificationRow: React.FC<WorkerVerificationRowProps> = ({
                                                                                 entry,
                                                                                 onViewDocument,
                                                                                 isLoadingDocument,
                                                                                 onApprove,
                                                                                 isApproving,
                                                                                 onReject,
                                                                                 isRejecting,
                                                                             }) => {
    const {t} = useTranslation("admin");

    return (
        <div data-testid="worker-verification-row" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b py-4 last:border-0">
            <div className="min-w-0">
                <p className="font-medium">{entry.name}</p>
                <p className="text-sm text-muted-foreground">{entry.email}</p>
                {entry.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.bio}</p>}
                {entry.years_of_experience !== null && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {t("verificationQueue.yearsOfExperience", {count: entry.years_of_experience})}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDocument(entry.id)}
                    disabled={isLoadingDocument}
                >
                    {isLoadingDocument ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4"/>}
                    {t("verificationQueue.viewDocument")}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    onClick={() => onApprove(entry.id)}
                    disabled={isApproving}
                >
                    {isApproving && <Loader2 className="h-4 w-4 animate-spin"/>}
                    {t("verificationQueue.approveButton")}
                </Button>
                <RejectVerificationDialog
                    isPending={isRejecting}
                    onConfirm={(reason) => onReject(entry.id, reason)}
                />
            </div>
        </div>
    );
};
