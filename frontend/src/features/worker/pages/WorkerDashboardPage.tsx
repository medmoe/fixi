import React from 'react';
import {useWorkerProfile} from '../hooks/useWorkerProfile.ts'
import {AvailabilityToggle} from '../components/AvailabilityToggle';
import {AvatarUploadField} from '../components/fields/AvatarUploadField';
import {ProfileForm} from '../components/ProfileForm';
import {AlertCircle, Loader2} from 'lucide-react';

export const WorkerDashboardPage: React.FC = () => {
    // Hardcoded for presentation abstraction context; typically extracted via Auth Token context boundaries
    const TARGET_WORKER_ID = 42;

    const {data: profile, isLoading, error} = useWorkerProfile(TARGET_WORKER_ID);

    if (isLoading) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">Hydrating your systems profile payload...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="mx-auto max-w-md my-12 border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <div>
                    <h3 className="font-semibold text-sm">System Synchronization Failure</h3>
                    <p className="text-xs opacity-90 mt-1">We ran into trouble loading data records from infrastructure nodes. Verify connection tokens and reload.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <header className="mb-8 space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Worker Administration Control</h1>
                <p className="text-muted-foreground">Manage service configurations, dispatch discovery profiles, and capability declarations.</p>
            </header>

            {/* Desktop Responsive Layout Engine Strategy Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                {/* Left Side: Dynamic Controls Column Group */}
                <div className="space-y-6 lg:col-span-1">
                    <AvailabilityToggle workerId={profile.id} isAvailable={profile.is_available}/>
                    <AvatarUploadField workerId={profile.id} currentAvatarUrl={profile.avatar_url}/>
                </div>

                {/* Right Side: Main Data Ingestion Form Panel Frame */}
                <div className="lg:col-span-2">
                    <ProfileForm profile={profile}/>
                </div>

            </div>
        </div>
    );
};