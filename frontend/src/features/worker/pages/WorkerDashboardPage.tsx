import React, {useState} from 'react'
import {useTranslation} from 'react-i18next'
import {AccountTab, useUser} from '@/features/user'
import {LogoutButton} from '@/components/LogoutButton'
import {NotificationBell} from '@/features/notification'
import {LanguageSwitcher} from '@/features/i18n'
import {AlertCircle, Briefcase, Loader2, UserCircle, Search} from 'lucide-react'
import {useWorkerProfile} from "@/features/worker/hooks/useWorkerProfile"
import {ProfileTab} from "@/features/worker/components/ProfileTab"
import {AvailabilityToggle} from "@/features/worker/components/AvailabilityToggle";
import {JobsTab} from "@/features/job";

type Tab = 'profile' | 'account' | 'jobs'

export const WorkerDashboardPage: React.FC = () => {
    const {t} = useTranslation('worker')
    const [activeTab, setActiveTab] = useState<Tab>('profile')

    const {data: user, isLoading: isLoadingUser, error: userError} = useUser()
    const {data: workerProfile, isLoading: isLoadingWorkerProfile, error: workerProfileError} = useWorkerProfile()

    if (isLoadingWorkerProfile || isLoadingUser) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">
                    {t('dashboard.loading')}
                </p>
            </div>
        )
    }

    if (workerProfileError || !workerProfile || userError || !user ) {
        return (
            <div className="mx-auto max-w-md my-12 border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <div>
                    <h3 className="font-semibold text-sm">
                        {t('dashboard.errorTitle')}
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        {t('dashboard.errorDescription')}
                    </p>
                </div>
            </div>
        )
    }

    const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'profile',
            label: t('dashboard.navProfile'),
            icon: <Briefcase className="h-4 w-4"/>,
        },
        {
            id: 'account',
            label: t('dashboard.navAccount'),
            icon: <UserCircle className="h-4 w-4"/>,
        },
        {
            id: 'jobs',
            label: t('dashboard.navJobs'),
            icon: <Search className="h-4 w-4"/>,
        }
    ]

    return (
        <div className="min-h-screen bg-background flex">
            {/* ═══ Sidebar ═══════════════════════════════════════════════════ */}
            <aside className="w-64 border-r bg-card hidden lg:flex flex-col">
                {/* Sidebar Header — User Identity */}
                <div data-testid="sidebar-header" className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {t(`role.${user?.role_type}`)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Availability Section — Prominent placement for operational status */}
                <div data-testid="availability-section" className="px-4 py-3 border-b bg-muted/30">
                    <AvailabilityToggle isAvailable={workerProfile ? workerProfile.is_available : false}/>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeTab === item.id
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                {/* Sidebar Footer: Logout */}
                <div className="p-4 border-t">
                    <LogoutButton/>
                </div>
            </aside>

            {/* ═══ Header + Main Content ══════════════════════════════════════ */}
            <div className="flex-1 flex flex-col">
                {/* Desktop Header — notification bell + language switcher; the sidebar covers identity/nav */}
                <header className="hidden lg:flex justify-end gap-1 border-b bg-card px-8 h-14 items-center">
                    <LanguageSwitcher/>
                    <NotificationBell/>
                </header>

                {/* Mobile Top Bar */}
                <header data-testid="mobile-header" className="lg:hidden border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{user?.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher/>
                        <NotificationBell/>
                        <LogoutButton/>
                    </div>
                </header>

                {/* Mobile Availability Banner */}
                <div data-testid="mobile-availability" className="lg:hidden px-4 py-2 border-b bg-muted/30">
                    <AvailabilityToggle isAvailable={workerProfile ? workerProfile.is_available : false}/>
                </div>

                {/* Mobile Tab Switcher */}
                <div className="lg:hidden border-b bg-card px-4 py-2 flex gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                activeTab === item.id
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </div>

                {/* Main Content */}
                <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
                    {activeTab === 'profile' && <ProfileTab/>}
                    {activeTab === 'account' && <AccountTab/>}
                    {activeTab === 'jobs' && <JobsTab/>}
                </main>
            </div>
        </div>
    )
}