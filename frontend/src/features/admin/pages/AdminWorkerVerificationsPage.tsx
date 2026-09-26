import React from "react";
import {useTranslation} from "react-i18next";
import {useWorkerVerificationQueue} from "../hooks/useWorkerVerificationQueue";
import {useApproveVerification} from "../hooks/useApproveVerification";
import {useRejectVerification} from "../hooks/useRejectVerification";
import {useVerificationDocumentUrl} from "../hooks/useVerificationDocumentUrl";
import {WorkerVerificationRow} from "../components/WorkerVerificationRow";

export const AdminWorkerVerificationsPage: React.FC = () => {
    const {t} = useTranslation("admin");
    const {data: queue = [], isLoading, isError} = useWorkerVerificationQueue();

    const approveMutation = useApproveVerification();
    const rejectMutation = useRejectVerification();
    const documentUrlMutation = useVerificationDocumentUrl();

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-xl font-semibold">{t("verificationQueue.title")}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {isLoading ? t("verificationQueue.loading") : t("verificationQueue.pendingCount", {count: queue.length})}
                </p>
            </div>

            {isError && <p className="text-sm text-destructive">{t("verificationQueue.loadError")}</p>}

            {isLoading && <p className="text-sm text-muted-foreground animate-pulse">{t("verificationQueue.loading")}</p>}

            {!isLoading && !isError && queue.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("verificationQueue.emptyState")}</p>
            )}

            {!isLoading && !isError && queue.length > 0 && (
                <div className="bg-card border rounded-xl px-4">
                    {queue.map((entry) => (
                        <WorkerVerificationRow
                            key={entry.id}
                            entry={entry}
                            onViewDocument={(id) => documentUrlMutation.mutate(id)}
                            isLoadingDocument={documentUrlMutation.isPending && documentUrlMutation.variables === entry.id}
                            onApprove={(id) => approveMutation.mutate(id)}
                            isApproving={approveMutation.isPending && approveMutation.variables === entry.id}
                            onReject={(id, reason) => rejectMutation.mutate({workerProfileId: id, reason})}
                            isRejecting={rejectMutation.isPending && rejectMutation.variables?.workerProfileId === entry.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
