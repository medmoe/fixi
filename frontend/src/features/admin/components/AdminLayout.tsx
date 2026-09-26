// src/features/admin/components/AdminLayout.tsx
//
// Persistent shell for every /admin/* route. Admin accounts are admin-only
// (see documentation/decisions/), so this replaces the customer/worker
// dashboard for superusers entirely rather than bolting admin links onto it.
import React from 'react'
import {useTranslation} from 'react-i18next'
import {Outlet, useLocation, useNavigate} from 'react-router-dom'
import {Banknote, BarChart3, FileCheck, Flag, Shield, UserCircle, Users} from 'lucide-react'
import {useUser} from '@/features/user'
import {NotificationBell} from '@/features/notification'
import {LanguageSwitcher} from '@/features/i18n'
import {LogoutButton} from '@/components/LogoutButton'

export const AdminLayout: React.FC = () => {
    const {t} = useTranslation('admin')
    const navigate = useNavigate()
    const {pathname} = useLocation()
    const {data: user} = useUser()

    const navItems = [
        {path: '/admin/users', label: t('layout.navUsers'), icon: <Users className="h-4 w-4"/>},
        {path: '/admin/worker-verifications', label: t('layout.navVerifications'), icon: <FileCheck className="h-4 w-4"/>},
        {path: '/admin/flagged-reviews', label: t('layout.navFlaggedReviews'), icon: <Flag className="h-4 w-4"/>},
        {path: '/admin/worker-billing', label: t('layout.navBilling'), icon: <Banknote className="h-4 w-4"/>},
        {path: '/admin/analytics', label: t('layout.navAnalytics'), icon: <BarChart3 className="h-4 w-4"/>},
        {path: '/admin/account', label: t('layout.navAccount'), icon: <UserCircle className="h-4 w-4"/>},
    ]

    // Prefix match so nested pages (e.g. /admin/users/:userId) keep their
    // section highlighted.
    const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`)

    return (
        <div className="min-h-screen bg-background flex">
            {/* ═══ Sidebar ═══════════════════════════════════════════════════ */}
            <aside className="w-64 border-r bg-card hidden lg:flex flex-col">
                <div data-testid="admin-sidebar-header" className="p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                            <Shield className="h-5 w-5"/>
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{t('layout.roleLabel')}</p>
                        </div>
                    </div>
                </div>

                <nav aria-label={t('layout.title')} className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            aria-current={isActive(item.path) ? 'page' : undefined}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                isActive(item.path)
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
            <div className="flex-1 flex flex-col min-w-0">
                {/* Desktop Header */}
                <header className="hidden lg:flex justify-between border-b bg-card px-8 h-14 items-center">
                    <span className="text-sm font-medium text-muted-foreground">{t('layout.title')}</span>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher/>
                        <NotificationBell/>
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="lg:hidden border-b bg-card px-4 h-14 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-2 min-w-0">
                        <Shield className="h-5 w-5 text-primary shrink-0"/>
                        <span className="font-medium text-sm truncate">{t('layout.title')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <LanguageSwitcher/>
                        <NotificationBell/>
                        <LogoutButton/>
                    </div>
                </header>

                {/* Mobile Nav — horizontally scrollable, five sections don't fit side by side */}
                <nav aria-label={t('layout.title')} className="lg:hidden border-b bg-card px-4 py-2 flex gap-2 overflow-x-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            aria-current={isActive(item.path) ? 'page' : undefined}
                            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                                isActive(item.path)
                                    ? 'bg-primary/10 text-primary font-medium'
                                    : 'text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <main className="flex-1 min-w-0">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
