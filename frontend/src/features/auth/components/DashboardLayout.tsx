// src/features/auth/components/DashboardLayout.tsx
import React from 'react'
import {useTranslation} from 'react-i18next'
import {useUser} from '@/features/user'
import {NotificationBell} from '@/features/notification'
import {LanguageSwitcher} from '@/features/i18n'
import {LogoutButton} from '@/components/LogoutButton'
import {AlertCircle, ArrowLeft, Home, Loader2, Search, UserCircle} from 'lucide-react'
import {Outlet, useLocation, useNavigate} from 'react-router-dom'

type Tab = 'profile' | 'account' | 'jobs'

export const DashboardLayout: React.FC = () => {
    const {t} = useTranslation('auth')
    const navigate = useNavigate()
    const location = useLocation()
    const {data: user, isLoading: isLoadingUser, error: userError} = useUser()

    // Determine active tab from URL, or default to 'profile'
    const path = location.pathname
    const activeTab: Tab = path.startsWith('/dashboard/jobs') ? 'jobs'
        : path === '/dashboard/account' ? 'account'
            : 'profile'

    // Check if we're in a nested job flow (view/edit/create)
    const isJobFlow = path.startsWith('/dashboard/jobs/') && path !== '/dashboard/jobs'

    if (isLoadingUser) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary"/>
                <p className="text-sm font-medium text-muted-foreground">{t('dashboard.loading')}</p>
            </div>
        )
    }

    if (userError || !user) {
        return (
            <div className="mx-auto max-w-md my-12 border-destructive/50 bg-destructive/10 text-destructive rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5"/>
                <div>
                    <h3 className="font-semibold text-sm">{t('dashboard.errorTitle')}</h3>
                    <p className="text-xs opacity-90 mt-1">{t('dashboard.errorDescription')}</p>
                </div>
            </div>
        )
    }

    const navItems: { id: Tab; label: string; icon: React.ReactNode; path: string }[] = [
        {id: 'profile', label: t('dashboard.navProfile'), icon: <Home className="h-4 w-4"/>, path: '/dashboard'},
        {id: 'account', label: t('dashboard.navAccount'), icon: <UserCircle className="h-4 w-4"/>, path: '/dashboard/account'},
        {id: 'jobs', label: t('dashboard.navJobs'), icon: <Search className="h-4 w-4"/>, path: '/dashboard/jobs'},
    ]

    return (
        <div className="min-h-screen bg-background flex">
            {/* ═══ Sidebar ═══════════════════════════════════════════════════ */}
            <aside className="w-64 border-r bg-card hidden lg:flex flex-col">
                <div data-testid="sidebar-header" className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{t(`role.${user.role_type}`)}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
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

                <div className="p-4 border-t">
                    <LogoutButton/>
                </div>
            </aside>

            {/* ═══ Main Area ═════════════════════════════════════════════════ */}
            <div className="flex-1 flex flex-col">
                {/* Desktop Header — notification bell + language switcher; the sidebar covers identity/nav */}
                <header className="hidden lg:flex justify-end gap-1 border-b bg-card px-8 h-14 items-center">
                    <LanguageSwitcher/>
                    <NotificationBell/>
                </header>

                {/* Mobile Header */}
                <header data-testid="mobile-header" className="lg:hidden border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{user.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher/>
                        <NotificationBell/>
                        <LogoutButton/>
                    </div>
                </header>

                {/* Mobile Tab Switcher */}
                <div className="lg:hidden border-b bg-card px-4 py-2 flex gap-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
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

                {/* Back button for nested job flows (mobile + desktop) */}
                {isJobFlow && (
                    <div className="px-4 pt-4 lg:px-8">
                        <button
                            onClick={() => navigate('/dashboard/jobs')}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4"/>
                            {t('dashboard.backToJobs')}
                        </button>
                    </div>
                )}

                {/* Content */}
                <main className="flex-1 container mx-auto px-4 py-6 lg:px-8 max-w-5xl">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}