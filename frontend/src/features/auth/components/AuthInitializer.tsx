import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useInitAuth } from '@/features/auth/hooks/useInitAuth'
import { useNotificationSocket } from '@/features/notification'
import { Loader2 } from 'lucide-react'

const PUBLIC_ROUTES = ['/', '/login', '/register']

export const AuthInitializer: React.FC = () => {
    // 1. Hook returns isAuthenticated directly from TanStack query result
    const { isLoading, isAuthenticated } = useInitAuth()
    const location = useLocation()

    // Mounted once for the whole authenticated session (this component wraps
    // every route) rather than tied to whichever dashboard header happens to
    // render NotificationBell -- previously the socket only stayed open while
    // NotificationBell itself was mounted, so navigating to any route outside
    // /dashboard (e.g. /jobs/:id, /workers/:id) silently dropped the
    // connection and missed pushes until a hard refresh. The hook itself
    // no-ops until Redux has isAuthenticated + accessToken, so this is safe
    // to call before that's true.
    useNotificationSocket()

    // 2. While verifying refresh token, render the full-screen loader
    if (isLoading) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Loading...</p>
            </div>
        )
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(location.pathname)

    // 3. Declarative Redirect: If authenticated user lands on login/register/landing, send to dashboard
    if (isAuthenticated && isPublicRoute) {
        return <Navigate to="/dashboard" replace />
    }

    // 4. Render matched child route
    return <Outlet />
}