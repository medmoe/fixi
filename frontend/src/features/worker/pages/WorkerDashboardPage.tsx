import React, {useState} from 'react'
import {AccountTab, useUser} from '@/features/user'
import {LogoutButton} from '@/components/LogoutButton'
import {AlertCircle, Briefcase, Loader2, UserCircle} from 'lucide-react'
import {useWorkerProfile} from "@/features/worker/hooks/useWorkerProfile"
import {ProfileTab} from "@/features/worker/components/ProfileTab"
import {AvailabilityToggle} from "@/features/worker/components/AvailabilityToggle";

type Tab = 'profile' | 'account'

export const WorkerDashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('profile')

    const {data: user, isLoading: isLoadingUser, error: userError} = useUser()
    const {data: workerProfile, isLoading: isLoadingWorkerProfile, error: workerProfileError} = useWorkerProfile()

    if (isLoadingWorkerProfile || isLoadingUser) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">
                    Loading your dashboard...
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
                        System Synchronization Failure
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                        We ran into trouble loading your account data. Please try
                        again later.
                    </p>
                </div>
            </div>
        )
    }

    const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'profile',
            label: 'Profile',
            icon: <Briefcase className="h-4 w-4"/>,
        },
        {
            id: 'account',
            label: 'Account',
            icon: <UserCircle className="h-4 w-4"/>,
        },
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
                            <p className="text-xs text-muted-foreground capitalize">
                                {user?.role_type}
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

            {/* ═══ Mobile Header + Main Content ══════════════════════════════ */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Top Bar */}
                <header data-testid="mobile-header" className="lg:hidden border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            {user?.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{user?.name}</span>
                    </div>
                    <LogoutButton/>
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
                </main>
            </div>
        </div>
    )
}