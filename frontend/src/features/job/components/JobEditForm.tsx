import React, {useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useNavigate, useParams} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {Button} from '@/components/ui/button';
import {Form} from '@/components/ui/form';
import {BudgetRangeField, DescriptionField, JobTradeCategoryField, JobUpdateRequest, jobUpdateSchema, TitleField, useUpdateJob,} from '@/features/job';
import {LocationSearchField} from '@/features/user';
import {jobApi} from '@/lib';
import {Skeleton} from '@/components/ui/skeleton';

type JobEditFormValues = JobUpdateRequest;

export const JobEditForm: React.FC = () => {
    const {t} = useTranslation('job');
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const jobId = Number(id);

    const {mutate: updateJob, isPending} = useUpdateJob();

    const {data: job, isLoading} = useQuery({
        queryKey: ['job', jobId],
        queryFn: () => jobApi.getJob(jobId),
        enabled: !isNaN(jobId),
    });

    const form = useForm<JobEditFormValues>({
        resolver: zodResolver(jobUpdateSchema),
        defaultValues: {
            title: '',
            description: undefined,
            trade_category_id: undefined,
            budget_min: undefined,
            budget_max: undefined,
            display_location: undefined,
            latitude: undefined,
            longitude: undefined,
        },
        mode: 'onTouched',
    });

    const {reset, handleSubmit, formState: {isValid, isDirty}} = form;
    const canSubmit = isDirty && isValid && !isPending;

    // Populate form when job data loads
    useEffect(() => {
        if (job) {
            reset({
                title: job.title,
                description: job.description ?? undefined,
                trade_category_id: job.trade_category_id ?? undefined,
                budget_min: job.budget_min ? Number(job.budget_min) : undefined,
                budget_max: job.budget_max ? Number(job.budget_max) : undefined,
                display_location: job.display_location ?? undefined,
                latitude: job.coordinates?.latitude,
                longitude: job.coordinates?.longitude,
            });
        }
    }, [job, reset]);

    const onSubmit = (data: JobEditFormValues) => {
        updateJob(
            {id: jobId, payload: data},
            {
                onSuccess: () => {
                    navigate(`/jobs/${jobId}`);
                },
            }
        );
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <Skeleton className="h-8 w-1/2"/>
                <Skeleton className="h-32 w-full"/>
                <Skeleton className="h-32 w-full"/>
            </div>
        );
    }

    if (!job) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center text-destructive">
                {t('shared.jobNotFound')}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">{t('jobEditForm.heading')}</h1>
            <Form {...form}>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    aria-label={t('jobEditForm.formAriaLabel')}
                    className="space-y-6 bg-card border p-6 rounded-xl shadow-sm"
                >
                    <TitleField/>

                    <DescriptionField/>

                    <JobTradeCategoryField/>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BudgetRangeField/>
                    </div>

                    <LocationSearchField/>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/jobs/${jobId}`)}
                        >
                            {t('shared.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={!canSubmit}
                            aria-label={t('jobEditForm.updateAriaLabel')}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true"/>
                                    {t('shared.updating')}
                                </>
                            ) : (
                                t('jobEditForm.updateJob')
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
};