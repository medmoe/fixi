import React from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useTranslation} from 'react-i18next';
import {ArrowLeft, Calendar, DollarSign, LogIn, MapPin, User, Wrench} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Separator} from '@/components/ui/separator';
import {Skeleton} from '@/components/ui/skeleton';
import {jobApi} from '@/lib';
import {ApplyToJobDialog, JobLifecycleActions, JobRead, JobStatus, useMyJobApplication} from '@/features/job';
import {useAuth} from '@/features/auth';
import {useUser} from '@/features/user';
import {useLocalizedTradeName} from '@/features/worker/hooks/useLocalizedTradeName';
import {ReviewCard} from '@/features/review';
import {useFormatCurrency, useFormatDate} from '@/lib/hooks/useFormatters';

const statusColors: Record<JobStatus, string> = {
    open: 'bg-green-100 text-green-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
};

export const JobDetailPage: React.FC = () => {
    const {t} = useTranslation('job');
    const formatCurrency = useFormatCurrency();
    const formatDate = useFormatDate();
    const getTradeName = useLocalizedTradeName();
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const jobId = Number(id);

    const {isAuthenticated} = useAuth();
    const {data: user} = useUser();

    const {data: job, isLoading, isError, error} = useQuery<JobRead>({
        queryKey: ['job', jobId],
        queryFn: () => jobApi.getJob(jobId),
        enabled: !isNaN(jobId),
    });

    const isWorker = user?.role_type === 'worker';

    // Also drives JobLifecycleActions below — cached by React Query, so this
    // doesn't cause an extra request beyond the one that component makes.
    const {data: myApplication} = useMyJobApplication(jobId, isAuthenticated && isWorker && !isNaN(jobId));

    // Returns wherever the user actually came from — public /jobs listing,
    // a worker's dashboard Jobs tab, or a shared direct link all "just
    // work" without this page needing to know which one it was.
    const handleBack = () => navigate(-1);

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-3/4"/>
                <Skeleton className="h-4 w-1/2"/>
                <Skeleton className="h-32 w-full"/>
            </div>
        );
    }

    if (isError || !job) {
        return (
            <div className="max-w-3xl mx-auto p-6 text-center">
                <p className="text-destructive mb-4">
                    {error instanceof Error ? error.message : t('shared.jobNotFound')}
                </p>
                <Button onClick={handleBack} variant="outline">
                    <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180"/>
                    {t('jobDetailPage.back')}
                </Button>
            </div>
        );
    }

    const isOpen = job.status === 'open';

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <Button onClick={handleBack} variant="ghost" size="sm" className="-ms-2">
                <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180"/>
                {t('jobDetailPage.back')}
            </Button>

            {/* Header */}
            <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold">{job.title}</h1>
                <Badge className={statusColors[job.status]}>
                    {job.status.replace('_', ' ')}
                </Badge>
            </div>

            <Separator/>

            {/* Meta info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                {job.trade_category && (
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4"/>
                        {getTradeName(job.trade_category)}
                    </div>
                )}
                {job.display_location && (
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4"/>
                        {job.display_location}
                    </div>
                )}
                {(job.budget_min || job.budget_max) && (
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4"/>
                        {job.budget_min && formatCurrency(Number(job.budget_min))}
                        {job.budget_min && job.budget_max && ' - '}
                        {job.budget_max && formatCurrency(Number(job.budget_max))}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4"/>
                    {t('jobDetailPage.postedOn', {date: formatDate(job.created_at)})}
                </div>
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4"/>
                    {t('jobDetailPage.customerLabel', {name: job.user?.name})}
                </div>
            </div>

            {/* Description */}
            {job.description && (
                <>
                    <Separator/>
                    <div>
                        <h2 className="text-lg font-semibold mb-2">{t('jobDetailPage.descriptionHeading')}</h2>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                            {job.description}
                        </p>
                    </div>
                </>
            )}

            {/* Apply — unauthenticated visitors get a login CTA, workers
                get the real apply flow. Customers (and any other role) see
                nothing here — applying isn't something they can do. */}
            {!isAuthenticated && (
                <>
                    <Separator/>
                    {isOpen ? (
                        <Button
                            className="w-full"
                            onClick={() => navigate('/login', {state: {from: location.pathname}})}
                        >
                            <LogIn className="me-2 h-4 w-4"/>
                            {t('jobDetailPage.loginToApply')}
                        </Button>
                    ) : (
                        <p className="text-xs text-muted-foreground text-center">
                            {t('jobDetailPage.applicationsClosed')}
                        </p>
                    )}
                </>
            )}

            {isAuthenticated && isWorker && !myApplication && (
                <>
                    <Separator/>
                    <ApplyToJobDialog
                        jobId={job.id}
                        jobTitle={job.title}
                        disabled={!isOpen}
                    />
                    {!isOpen && (
                        <p className="text-xs text-muted-foreground text-center">
                            {t('jobDetailPage.applicationsClosed')}
                        </p>
                    )}
                </>
            )}

            {/* Lifecycle actions — confirm/withdraw/start/complete. Gates
                itself internally based on role and where the job/application
                actually stand, so it's safe to always mount when signed in. */}
            {isAuthenticated && (
                <>
                    <Separator/>
                    <JobLifecycleActions job={job}/>
                </>
            )}

            {/* Review card — the query behind it enforces the three
                eligibility guards server-side, so this just gates the
                network call to when it could possibly be relevant. */}
            {isAuthenticated && job.status === 'completed' && (
                <>
                    <Separator/>
                    <ReviewCard jobId={job.id}/>
                </>
            )}
        </div>
    );
};
