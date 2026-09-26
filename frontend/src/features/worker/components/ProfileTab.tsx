import React from 'react'
import {useTranslation} from 'react-i18next'
import {useWorkerProfile} from '@/features/worker'
import {ProfileForm} from './ProfileForm'
import {PortfolioManager} from './PortfolioManager'
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
    const {t} = useTranslation('worker')

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
                    {t('profileTab.loading')}
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
                        {t('profileTab.loadFailedTitle')}
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        {t('profileTab.loadFailedDescription')}
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
                        {t('profileTab.notFoundTitle')}
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        {t('profileTab.notFoundDescription')}
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
                    {t('profileTab.heading')}
                </h2>
                <p className="text-muted-foreground">
                    {t('profileTab.subtitle')}
                </p>
            </header>

            <ProfileForm profile={profile}/>
            <PortfolioManager workerProfileId={profile.id}/>
        </div>
    )
}
