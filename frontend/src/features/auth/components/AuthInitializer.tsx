import React from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useInitAuth } from '@/features/auth/hooks/useInitAuth'
import { Loader2 } from 'lucide-react'

const PUBLIC_ROUTES = ['/', '/login', '/register']

export const AuthInitializer: React.FC = () => {
    // 1. Hook returns isAuthenticated directly from TanStack query result
    const { isLoading, isAuthenticated } = useInitAuth()
    const location = useLocation()

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