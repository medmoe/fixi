import React, {useState} from "react";
import {Loader2} from "lucide-react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button";
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {useAuth} from "@/features/auth";
import {useUser} from "@/features/user";
import {
    DECLINE_REASON_OPTIONS,
    JobRead,
    useCompleteJob,
    useConfirmApplication,
    useMyJobApplication,
    useStartJob,
    useWithdrawApplication,
} from "@/features/job";
import type {ApplicationDeclineReason} from "../types";

interface JobLifecycleActionsProps {
    job: JobRead;
}

export const JobLifecycleActions: React.FC<JobLifecycleActionsProps> = ({job}) => {
    const {t} = useTranslation("job");
    const {isAuthenticated} = useAuth();
    const {data: user} = useUser();
    const isCustomer = isAuthenticated && user?.id === job.user_id;

    const {data: myApplication} = useMyJobApplication(job.id, isAuthenticated && !isCustomer);
    const {mutate: confirmApplication, isPending: isConfirming} = useConfirmApplication(job.id);
    const {mutate: withdrawApplication, isPending: isWithdrawing} = useWithdrawApplication(job.id);
    const {mutate: startJob, isPending: isStarting} = useStartJob(job.id);
    const {mutate: completeJob, isPending: isCompleting} = useCompleteJob(job.id);

    const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

    if (!isAuthenticated || (!isCustomer && !myApplication)) {
        return null;
    }

    const isAssignedWorker = myApplication?.status === "accepted";

    const handleWithdraw = (reason: ApplicationDeclineReason) => {
        if (!myApplication) return;
        withdrawApplication(
            {appId: myApplication.id, declineReason: reason},
            {onSuccess: () => setShowWithdrawDialog(false)}
        );
    };

    const withdrawDialog = myApplication && (
        <WithdrawApplicationDialog
            open={showWithdrawDialog}
            onOpenChange={setShowWithdrawDialog}
            onConfirm={handleWithdraw}
            isPending={isWithdrawing}
        />
    );

    // ─── OPEN: worker accepted, awaiting their confirmation ──────────────
    if (job.status === "open" && isAssignedWorker && !myApplication.worker_confirmed_at) {
        return (
            <div className="rounded-lg border p-4 space-y-3">
                <div>
                    <p className="text-sm font-medium">{t("jobLifecycleActions.acceptedHeading")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t("jobLifecycleActions.acceptedDescription")}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => confirmApplication(myApplication.id)} disabled={isConfirming}>
                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {t("jobLifecycleActions.confirmAssignment")}
                    </Button>
                    <Button variant="outline" onClick={() => setShowWithdrawDialog(true)} disabled={isWithdrawing}>
                        {t("jobLifecycleActions.withdraw")}
                    </Button>
                </div>
                {withdrawDialog}
            </div>
        );
    }

    // ─── OPEN: worker still pending — can withdraw before a decision ─────
    if (job.status === "open" && myApplication?.status === "pending") {
        return (
            <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm text-muted-foreground">{t("jobLifecycleActions.pendingReview")}</p>
                <Button variant="outline" size="sm" onClick={() => setShowWithdrawDialog(true)}>
                    {t("jobLifecycleActions.withdrawApplication")}
                </Button>
                {withdrawDialog}
            </div>
        );
    }

    // ─── ASSIGNED: confirmed worker starts the job ───────────────────────
    if (job.status === "assigned" && isAssignedWorker) {
        return (
            <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">{t("jobLifecycleActions.assignedHeading")}</p>
                <Button onClick={() => startJob()} disabled={isStarting}>
                    {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    {t("jobLifecycleActions.startJob")}
                </Button>
            </div>
        );
    }

    // ─── IN_PROGRESS: either participant can mark their side complete ────
    if (job.status === "in_progress" && (isCustomer || isAssignedWorker)) {
        const alreadyMarked = isCustomer ? job.customer_marked_complete_at !== null : job.worker_marked_complete_at !== null;

        return (
            <div className="rounded-lg border p-4 space-y-2">
                {alreadyMarked ? (
                    <p className="text-sm text-muted-foreground">
                        {t("jobLifecycleActions.markedComplete")}
                    </p>
                ) : (
                    <>
                        <p className="text-sm font-medium">{t("jobLifecycleActions.isJobDoneHeading")}</p>
                        <Button onClick={() => completeJob()} disabled={isCompleting}>
                            {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            {t("jobLifecycleActions.markAsComplete")}
                        </Button>
                    </>
                )}
            </div>
        );
    }

    return null;
};

// ─── Withdraw dialog ──────────────────────────────────────────────────────

interface WithdrawApplicationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: ApplicationDeclineReason) => void;
    isPending: boolean;
}

const WithdrawApplicationDialog: React.FC<WithdrawApplicationDialogProps> = ({open, onOpenChange, onConfirm, isPending}) => {
    const {t} = useTranslation("job");
    const [reason, setReason] = useState<ApplicationDeclineReason | "">("");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("jobLifecycleActions.withdrawDialogTitle")}</DialogTitle>
                    <DialogDescription>{t("jobLifecycleActions.withdrawDialogDescription")}</DialogDescription>
                </DialogHeader>

                <Select value={reason} onValueChange={(value) => setReason(value as ApplicationDeclineReason)}>
                    <SelectTrigger aria-label={t("jobLifecycleActions.reasonForWithdrawingAriaLabel")}>
                        <SelectValue placeholder={t("shared.selectAReason")}/>
                    </SelectTrigger>
                    <SelectContent>
                        {DECLINE_REASON_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {t("shared.cancel")}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => reason && onConfirm(reason)}
                        disabled={!reason || isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {t("jobLifecycleActions.withdraw")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
