import React from 'react'
import {useWorkerProfile} from '@/features/worker'
import {ProfileForm} from './ProfileForm'
import {AlertCircle, Briefcase, Loader2} from 'lucide-react'

/**
 * ProfileTab — Public-facing worker representation.
 *
 * On registration, a worker profile is auto-created with just user_id.
 * The worker fetches their profile and can update fields via ProfileForm.
 *
 * Uses existing worker feature:
 * - useWorkerProfile(user.id): fetches profile
 * - ProfileForm: updates existing profile (bio, hourly_rate, service_radius_km, trades)
 */
export const ProfileTab: React.FC = () => {

    const {
        data: profile,
        isLoading: profileLoading,
        isError: isProfileError,
        error: profileError,
    } = useWorkerProfile()

    if (profileLoading) {
        return (
            <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">
                    Loading your worker profile...
                </p>
            </div>
        )
    }

    if (isProfileError) {
        console.error(profileError)
        return (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <div>
                    <h3 className="font-semibold text-sm">
                        Failed to Load Profile
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        Something went wrong loading your profile data. Please try
                        again later.
                    </p>

                </div>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <div>
                    <h3 className="font-semibold text-sm">
                        Profile Not Found
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        Your worker profile could not be found. Please contact support.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Briefcase className="h-8 w-8 text-primary"/>
                    Worker Profile
                </h2>
                <p className="text-muted-foreground">
                    Manage your public-facing profile, availability, and service
                    capabilities.
                </p>
            </header>

            <ProfileForm profile={profile}/>
        </div>
    )
}