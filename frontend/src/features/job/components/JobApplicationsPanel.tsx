import React, {useState} from "react";
import {Link} from "react-router-dom";
import {useTranslation} from "react-i18next";
import {AlertCircle, Briefcase, CheckCircle2, ChevronDown, ChevronUp, Clock, DollarSign, Loader2, MapPin, User, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {ApplicationDeclineReason, ApplicationStatus, DECLINE_REASON_OPTIONS, JobApplicationRead, useJobApplications, useUpdateJobApplication} from "@/features/job";
import {UserPublicRead} from "@/features/user";

const applicationStatusIcons: Record<ApplicationStatus, { icon: React.ReactNode; color: string }> = {
    pending: {icon: <Clock className="h-3.5 w-3.5"/>, color: "bg-yellow-100 text-yellow-800 border-yellow-200"},
    accepted: {icon: <CheckCircle2 className="h-3.5 w-3.5"/>, color: "bg-green-100 text-green-800 border-green-200"},
    rejected: {icon: <XCircle className="h-3.5 w-3.5"/>, color: "bg-red-100 text-red-800 border-red-200"},
};

interface JobApplicationsPanelProps {
    jobId: number;
    jobStatus: string;
}

export const JobApplicationsPanel: React.FC<JobApplicationsPanelProps> = ({jobId, jobStatus}) => {
    const {t} = useTranslation("job");
    const [isExpanded, setIsExpanded] = useState(false);
    const [appPendingAction, setAppPendingAction] = useState<{ app: JobApplicationRead; newStatus: ApplicationStatus } | null>(null);
    const [declineReason, setDeclineReason] = useState<ApplicationDeclineReason | "">("");
    const [actionError, setActionError] = useState<string | null>(null);

    const {data, isLoading, isError} = useJobApplications(jobId);
    const {mutate: updateApplication, isPending: isUpdating} = useUpdateJobApplication();

    const applications = data?.data ?? [];
    const pendingCount = applications.filter(a => a.status === "pending").length;

    const openActionDialog = (app: JobApplicationRead, newStatus: ApplicationStatus) => {
        setActionError(null);
        setDeclineReason("");
        setAppPendingAction({app, newStatus});
    };

    const closeActionDialog = () => {
        setAppPendingAction(null);
        setActionError(null);
    };

    const isRejecting = appPendingAction?.newStatus === "rejected";

    const handleConfirmAction = () => {
        if (!appPendingAction) return;
        const {app, newStatus} = appPendingAction;
        setActionError(null);
        updateApplication(
            {jobId, appId: app.id, payload: {status: newStatus, ...(isRejecting ? {decline_reason: declineReason as ApplicationDeclineReason} : {})}},
            {
                onSuccess: () => closeActionDialog(),
                onError: (error) => {
                    setActionError(error instanceof Error ? error.message : t("jobApplicationsPanel.genericError"));
                },
            }
        );
    };

    const getActionDialogContent = () => {
        if (!appPendingAction) return null;
        const workerName = getWorkerName(appPendingAction.app, t("jobApplicationsPanel.unknownWorker"));
        if (appPendingAction.newStatus === "accepted") {
            return {
                title: t("jobApplicationsPanel.acceptDialogTitle"),
                // FIX: previous copy claimed this cascades to reject other
                // applications and flips the job to "assigned" — the backend
                // (crud_job_applications.update_job_application) doesn't do
                // either of those, it only updates this one application's
                // status. Update this copy again if/when that cascade is
                // actually implemented server-side.
                description: t("jobApplicationsPanel.acceptDialogDescription", {workerName}),
                confirmLabel: t("jobApplicationsPanel.accept"),
                confirmClass: "bg-green-600 text-white hover:bg-green-700",
            };
        }
        return {
            title: t("jobApplicationsPanel.rejectDialogTitle"),
            description: t("jobApplicationsPanel.rejectDialogDescription", {workerName}),
            confirmLabel: t("jobApplicationsPanel.reject"),
            confirmClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        };
    };

    const dialogContent = getActionDialogContent();

    return (
        <div className="border-t bg-muted/30">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                aria-expanded={isExpanded}
            >
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground"/>
                    <span>{t("jobApplicationsPanel.toggleLabel")}</span>
                    {applications.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {applications.length}
                        </Badge>
                    )}
                    {pendingCount > 0 && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                            {t("jobApplicationsPanel.pendingCount", {count: pendingCount})}
                        </Badge>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground"/>
                ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground"/>
                )}
            </button>

            {isExpanded && (
                <div className="px-4 pb-4">
                    {isLoading && (
                        <div className="space-y-3">
                            {[1, 2].map((i) => (
                                <Card key={i}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Skeleton className="h-10 w-10 rounded-full"/>
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-32"/>
                                                <Skeleton className="h-3 w-full"/>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {isError && (
                        <div className="flex items-center gap-2 text-sm text-destructive py-4">
                            <AlertCircle className="h-4 w-4"/>
                            {t("jobApplicationsPanel.loadError")}
                        </div>
                    )}

                    {!isLoading && !isError && applications.length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            {t("jobApplicationsPanel.emptyState")}
                        </div>
                    )}

                    {!isLoading && !isError && applications.length > 0 && (
                        <div className="space-y-3">
                            {applications.map((app) => (
                                <ApplicationCard
                                    key={app.id}
                                    application={app}
                                    jobStatus={jobStatus}
                                    onAction={(newStatus) => openActionDialog(app, newStatus)}
                                    isUpdating={isUpdating}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <AlertDialog
                open={appPendingAction !== null}
                onOpenChange={(open) => !open && closeActionDialog()}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogContent?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{dialogContent?.description}</AlertDialogDescription>
                    </AlertDialogHeader>

                    {isRejecting && (
                        <Select value={declineReason} onValueChange={(value) => setDeclineReason(value as ApplicationDeclineReason)}>
                            <SelectTrigger aria-label={t("jobApplicationsPanel.reasonForRejectingAriaLabel")}>
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
                    )}

                    {actionError && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0"/>
                            <span>{actionError}</span>
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpdating}>{t("shared.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={isUpdating || (isRejecting && !declineReason)}
                            className={dialogContent?.confirmClass}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin"/>
                                    {t("shared.updating")}
                                </>
                            ) : (
                                dialogContent?.confirmLabel
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

// ─── Application Card ─────────────────────────────────────────────────────

interface ApplicationCardProps {
    application: JobApplicationRead;
    jobStatus: string;
    onAction: (status: ApplicationStatus) => void;
    isUpdating: boolean;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({application, jobStatus, onAction, isUpdating}) => {
    const {t} = useTranslation("job");
    const worker = application.worker_profile;
    const user = worker?.user;
    const config = applicationStatusIcons[application.status];
    const statusLabel = t(`jobApplicationsPanel.status.${application.status}`);
    const isPending = application.status === "pending";
    const canAct = isPending && jobStatus === "open";

    const initials = getInitials(user);
    const workerName = getWorkerName(application, t("jobApplicationsPanel.unknownWorker"));
    const trades = worker?.trade_categories
        ?.map(tc => tc.trade_category?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || null;

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={worker?.avatar_url || undefined} alt={workerName}/>
                        <AvatarFallback className="text-sm">{initials}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                        to={`/workers/${worker?.id}`}
                                        className="font-medium text-sm hover:underline truncate"
                                    >
                                        {workerName}
                                    </Link>
                                    <Badge variant="outline" className={`text-xs ${config.color}`}>
                                        <span className="flex items-center gap-1">
                                            {config.icon}
                                            {statusLabel}
                                        </span>
                                    </Badge>
                                </div>

                                {trades && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                        <Briefcase className="h-3 w-3"/>
                                        <span className="truncate">{trades}</span>
                                    </div>
                                )}
                            </div>

                            {canAct && (
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50 hover:text-green-800"
                                        onClick={() => onAction("accepted")}
                                        disabled={isUpdating}
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5 me-1"/>
                                        {t("jobApplicationsPanel.accept")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                                        onClick={() => onAction("rejected")}
                                        disabled={isUpdating}
                                    >
                                        <XCircle className="h-3.5 w-3.5 me-1"/>
                                        {t("jobApplicationsPanel.reject")}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {worker?.years_of_experience !== null && worker?.years_of_experience !== undefined && (
                                <span>{t("jobApplicationsPanel.yearsExp", {count: worker.years_of_experience})}</span>
                            )}
                            {worker?.hourly_rate !== null && worker?.hourly_rate !== undefined && (
                                <span className="flex items-center gap-0.5">
                                    <DollarSign className="h-3 w-3"/>
                                    {t("jobApplicationsPanel.perHour", {rate: worker.hourly_rate})}
                                </span>
                            )}
                            {worker?.service_radius_km !== null && worker?.service_radius_km !== undefined && (
                                <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3"/>
                                    {t("jobApplicationsPanel.radiusKm", {radius: worker.service_radius_km})}
                                </span>
                            )}
                        </div>

                        {application.message && (
                            <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                                <span className="text-xs font-medium text-foreground">{t("jobApplicationsPanel.message")}</span>
                                <p className="mt-0.5">{application.message}</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// ─── Helpers ──────────────────────────────────────────────────────────────

function getWorkerName(app: JobApplicationRead, unknownWorkerLabel: string): string {
    const user = app.worker_profile?.user;
    if (user) {
        return user.name;
    }
    return unknownWorkerLabel;
}

function getInitials(user?: UserPublicRead): string {
    if (!user) return "??";
    // FIX: guard against an empty/whitespace-only name, which previously
    // produced a silent blank avatar fallback instead of the "??" default.
    const trimmedName = user.name?.trim();
    if (!trimmedName) return "??";
    const words = trimmedName.split(" ").filter(Boolean);
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
