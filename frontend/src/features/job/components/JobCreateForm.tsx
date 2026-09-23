import React from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Form} from '@/components/ui/form';
import {BudgetRangeField, DescriptionField, JobCreateRequest, jobPostSchema, JobTradeCategoryField, TitleField, useCreateJob} from '@/features/job';
import {LocationSearchField} from '@/features/user';
import {useNavigate} from "react-router-dom";

type JobCreateFormValues = JobCreateRequest;

export const JobCreateForm: React.FC = () => {
    const {t} = useTranslation('job');
    const navigate = useNavigate();
    const {mutate: createJob, isPending} = useCreateJob();

    const form = useForm<JobCreateFormValues>({
        resolver: zodResolver(jobPostSchema),
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

    const {handleSubmit, formState: {isValid, isDirty}} = form;
    const canSubmit = isDirty && isValid && !isPending;

    const onSubmit = (data: JobCreateFormValues) => {
        createJob(data, {
            onSuccess: () => navigate("/dashboard/jobs")
        });
    };

    return (
        <Form {...form}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                aria-label={t('jobCreateForm.formAriaLabel')}
                className="space-y-6 bg-card border p-6 rounded-xl shadow-sm"
            >
                <TitleField/>

                <DescriptionField/>

                <JobTradeCategoryField/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BudgetRangeField/>
                </div>

                <LocationSearchField/>

                <div className="flex justify-end pt-4 border-t">
                    <Button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full"
                        aria-label={t('jobCreateForm.submitAriaLabel')}
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true"/>
                                {t('jobCreateForm.creating')}
                            </>
                        ) : (
                            t('jobCreateForm.postJob')
                        )}
                    </Button>
                </div>
            </form>
        </Form>
    );
};