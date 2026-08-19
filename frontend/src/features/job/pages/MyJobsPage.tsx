import React from 'react';
import {useQuery} from '@tanstack/react-query';
import {useNavigate} from 'react-router-dom';
import {Eye, Pencil, Plus, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {jobApi} from '@/lib';
import {JobRead, JobStatus} from '@/features/job';
import {PaginatedListResponse} from "@/features/types"
import {useUser} from '@/features/user';

const statusColors: Record<JobStatus, string> = {
    open: 'bg-green-100 text-green-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
};

export const MyJobsPage: React.FC = () => {
    const navigate = useNavigate();
    const {data: user, isLoading: isLoadingUser, error: userError} = useUser();

    const {data, isLoading, isError} = useQuery<PaginatedListResponse<JobRead>>({
        queryKey: ['jobs', {user_id: user?.id}],
        queryFn: () => jobApi.getMyJobs(),
        enabled: !!user,
    });

    const handleDelete = async (jobId: number) => {
        if (window.confirm('Are you sure you want to delete this job?')) {
            await jobApi.deleteJob(jobId);
        }
    };

    if (isLoadingUser) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4">
                <Skeleton className="h-8 w-48"/>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full"/>
                ))}
            </div>
        );
    }

    if (userError || !user) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-destructive">
                Please sign in to view your jobs.
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-4">
                <Skeleton className="h-8 w-48"/>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full"/>
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-destructive">
                Failed to load jobs. Please try again.
            </div>
        );
    }

    const jobs = data?.data ?? [];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">My Jobs</h1>
                <Button onClick={() => navigate('/jobs/create')}>
                    <Plus className="mr-2 h-4 w-4"/>
                    Post New Job
                </Button>
            </div>

            {/* Jobs List */}
            {jobs.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <p className="mb-4">You haven&apos;t posted any jobs yet.</p>
                        <Button onClick={() => navigate('/jobs/create')} variant="outline">
                            <Plus className="mr-2 h-4 w-4"/>
                            Post Your First Job
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {jobs.map((job: JobRead) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg font-semibold mb-1">
                                            {job.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Badge
                                                variant="secondary"
                                                className={statusColors[job.status]}
                                            >
                                                {job.status.replace('_', ' ')}
                                            </Badge>
                                            <span>
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </span>
                                            {job.budget_min && (
                                                <span>${job.budget_min}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => navigate(`/jobs/${job.id}`)}
                                            aria-label={`View job ${job.title}`}
                                        >
                                            <Eye className="h-4 w-4"/>
                                        </Button>
                                        {job.status === 'open' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => navigate(`/jobs/${job.id}/edit`)}
                                                aria-label={`Edit job ${job.title}`}
                                            >
                                                <Pencil className="h-4 w-4"/>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(job.id)}
                                            aria-label={`Delete job ${job.title}`}
                                        >
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            {job.description && (
                                <CardContent className="pt-0">
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {job.description}
                                    </p>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};