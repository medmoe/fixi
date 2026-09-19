import React, {useState} from "react";
import {Loader2} from "lucide-react";
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
                    <p className="text-sm font-medium">You've been accepted for this job!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                        Confirm once you and the customer have agreed on the details, or withdraw if it's not a fit.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => confirmApplication(myApplication.id)} disabled={isConfirming}>
                        {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Confirm assignment
                    </Button>
                    <Button variant="outline" onClick={() => setShowWithdrawDialog(true)} disabled={isWithdrawing}>
                        Withdraw
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
                <p className="text-sm text-muted-foreground">Your application is pending review.</p>
                <Button variant="outline" size="sm" onClick={() => setShowWithdrawDialog(true)}>
                    Withdraw application
                </Button>
                {withdrawDialog}
            </div>
        );
    }

    // ─── ASSIGNED: confirmed worker starts the job ───────────────────────
    if (job.status === "assigned" && isAssignedWorker) {
        return (
            <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">You're assigned to this job.</p>
                <Button onClick={() => startJob()} disabled={isStarting}>
                    {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Start job
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
                        Marked complete — waiting for the other party to confirm.
                    </p>
                ) : (
                    <>
                        <p className="text-sm font-medium">Is this job done?</p>
                        <Button onClick={() => completeJob()} disabled={isCompleting}>
                            {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Mark as complete
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
    const [reason, setReason] = useState<ApplicationDeclineReason | "">("");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Withdraw application?</DialogTitle>
                    <DialogDescription>Let the customer know why — this helps us improve future matches.</DialogDescription>
                </DialogHeader>

                <Select value={reason} onValueChange={(value) => setReason(value as ApplicationDeclineReason)}>
                    <SelectTrigger aria-label="Reason for withdrawing">
                        <SelectValue placeholder="Select a reason"/>
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
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => reason && onConfirm(reason)}
                        disabled={!reason || isPending}
                    >
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Withdraw
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
