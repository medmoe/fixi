import React from 'react';
import {SubmitHandler, useForm} from 'react-hook-form'; // Import SubmitHandler
import {zodResolver} from '@hookform/resolvers/zod';
import {WorkerProfileFormValues, workerProfileSchema} from '../schemas/workerProfileSchema';
import {UpdateWorkerProfilePayload, WorkerProfile} from '../types/worker.types';
import {useUpdateWorkerProfile} from '../hooks/useUpdateWorkerProfile';
import {Form} from '@/components/ui/form';
import {Button} from '@/components/ui/button';
import {BioField} from './fields/BioField';
import {HourlyRateField} from './fields/HourlyRateField';
import {ServiceRadiusField} from './fields/ServiceRadiusField';
import {TradesPicker} from './trades/TradesPicker';
import {Loader2, Save} from 'lucide-react';

interface ProfileFormProps {
    profile: WorkerProfile;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({profile}) => {
    const {mutate: updateProfile, isPending} = useUpdateWorkerProfile(profile.id);

    // 1. react-hook-form uses WorkerProfileFormValues (z.input) to safely track state
    const form = useForm<WorkerProfileFormValues>({
        resolver: zodResolver(workerProfileSchema),
        defaultValues: {
            bio: profile.bio || '',
            hourly_rate: profile.hourly_rate || undefined,
            service_radius_km: profile.service_radius_km || 25,
            trades: profile.trades.map(t => ({trade_id: t.trade_id, skill_level: t.skill_level}))
        }
    });

    const {handleSubmit, formState: {isDirty, isValid}} = form;

    // 2. Explicitly type the onSubmit using SubmitHandler mapped to the schema
    const onSubmit: SubmitHandler<WorkerProfileFormValues> = (values) => {

        // 3. Force Zod to parse and validate the form values right before sending.
        // This safely casts hourly_rate and service_radius_km from 'unknown' into 'number | undefined'
        const parsedPayload = workerProfileSchema.parse(values) as UpdateWorkerProfilePayload;

        updateProfile(parsedPayload, {
            onSuccess: () => form.reset(values)
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-card border p-6 rounded-xl shadow-sm">
                {/* ... field contents remain identical ... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HourlyRateField/>
                    <ServiceRadiusField/>
                </div>
                <BioField/>
                <div className="border-t pt-6">
                    <TradesPicker/>
                </div>
                <div className="flex justify-end pt-4 border-t">
                    <Button type="submit" disabled={!isDirty || !isValid || isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Save Profile
                    </Button>
                </div>
            </form>
        </Form>
    );
};