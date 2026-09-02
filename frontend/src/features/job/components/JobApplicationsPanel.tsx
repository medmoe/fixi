import React, {useState} from "react";
import {Link} from "react-router-dom";
import {AlertCircle, Briefcase, CheckCircle2, ChevronDown, ChevronUp, Clock, DollarSign, Loader2, MapPin, User, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Card, CardContent} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";
import {ApplicationStatus, JobApplicationRead, useJobApplications, useUpdateJobApplication} from "@/features/job";
import {UserPublicRead} from "@/features/user";

const applicationStatusConfig: Record<ApplicationStatus, { label: string; icon: React.ReactNode; color: string }> = {
    pending: {label: "Pending", icon: <Clock className="h-3.5 w-3.5"/>, color: "bg-yellow-100 text-yellow-800 border-yellow-200"},
    accepted: {label: "Accepted", icon: <CheckCircle2 className="h-3.5 w-3.5"/>, color: "bg-green-100 text-green-800 border-green-200"},
    rejected: {label: "Rejected", icon: <XCircle className="h-3.5 w-3.5"/>, color: "bg-red-100 text-red-800 border-red-200"},
};

interface JobApplicationsPanelProps {
    jobId: number;
    jobStatus: string;
}

export const JobApplicationsPanel: React.FC<JobApplicationsPanelProps> = ({jobId, jobStatus}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [appPendingAction, setAppPendingAction] = useState<{ app: JobApplicationRead; newStatus: ApplicationStatus } | null>(null);

    const {data, isLoading, isError} = useJobApplications(isExpanded ? jobId : null);
    const {mutate: updateApplication, isPending: isUpdating} = useUpdateJobApplication();

    const applications = data?.data ?? [];
    const pendingCount = applications.filter(a => a.status === "pending").length;

    const handleConfirmAction = () => {
        if (!appPendingAction) return;
        const {app, newStatus} = appPendingAction;
        updateApplication(
            {jobId, appId: app.id, payload: {status: newStatus}},
            {onSuccess: () => setAppPendingAction(null)}
        );
    };

    const getActionDialogContent = () => {
        if (!appPendingAction) return null;
        const workerName = getWorkerName(appPendingAction.app);
        if (appPendingAction.newStatus === "accepted") {
            return {
                title: "Accept Application?",
                description: `You are about to accept ${workerName}'s application. This will reject all other pending applications for this job and the job status will change to "assigned".`,
                confirmLabel: "Accept",
                confirmClass: "bg-green-600 text-white hover:bg-green-700",
            };
        }
        return {
            title: "Reject Application?",
            description: `Reject ${workerName}'s application for this job? This action cannot be undone.`,
            confirmLabel: "Reject",
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
                    <span>Applications</span>
                    {applications.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {applications.length}
                        </Badge>
                    )}
                    {pendingCount > 0 && (
                        <Badge className="text-xs bg-yellow-100 text-yellow-800">
                            {pendingCount} pending
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
                            Failed to load applications. Please try again.
                        </div>
                    )}

                    {!isLoading && !isError && applications.length === 0 && (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            No applications yet for this job.
                        </div>
                    )}

                    {!isLoading && !isError && applications.length > 0 && (
                        <div className="space-y-3">
                            {applications.map((app) => (
                                <ApplicationCard
                                    key={app.id}
                                    application={app}
                                    jobStatus={jobStatus}
                                    onAction={(newStatus) => setAppPendingAction({app, newStatus})}
                                    isUpdating={isUpdating}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            <AlertDialog
                open={appPendingAction !== null}
                onOpenChange={(open) => !open && setAppPendingAction(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogContent?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{dialogContent?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            disabled={isUpdating}
                            className={dialogContent?.confirmClass}
                        >
                            {isUpdating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    Updating...
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
    const worker = application.worker_profile;
    const user = worker?.user;
    const config = applicationStatusConfig[application.status];
    const isPending = application.status === "pending";
    const canAct = isPending && jobStatus === "open";

    const initials = getInitials(user);
    const workerName = getWorkerName(application);
    const trades = worker?.trade_categories?.map(t => t.trade_category?.name).join(", ") || null;

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
                                            {config.label}
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
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1"/>
                                        Accept
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                                        onClick={() => onAction("rejected")}
                                        disabled={isUpdating}
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1"/>
                                        Reject
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {worker?.years_of_experience !== null && worker?.years_of_experience !== undefined && (
                                <span>{worker.years_of_experience} years exp.</span>
                            )}
                            {worker?.hourly_rate !== null && worker?.hourly_rate !== undefined && (
                                <span className="flex items-center gap-0.5">
                                    <DollarSign className="h-3 w-3"/>
                                    {worker.hourly_rate}/hr
                                </span>
                            )}
                            {worker?.service_radius_km !== null && worker?.service_radius_km !== undefined && (
                                <span className="flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3"/>
                                    {worker.service_radius_km}km radius
                                </span>
                            )}
                        </div>

                        {application.message && (
                            <div className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-md p-2">
                                <span className="text-xs font-medium text-foreground">Message:</span>
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

function getWorkerName(app: JobApplicationRead): string {
    const user = app.worker_profile?.user;
    if (user) {
        return user.name;
    }
    return "Unknown Worker";
}

function getInitials(user?: UserPublicRead): string {
    if (!user) return "??";
    const words = user.name.split(" ")
    if (words.length === 1) {
        return words[0].charAt(0).toUpperCase();
    }
    return words[0].charAt(0) + words[words.length - 1].charAt(0);
}