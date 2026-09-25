import React from 'react'
import {Navigate, useLocation} from 'react-router-dom'
import {useAuth} from '@/features/auth'
import {useUser} from '@/features/user'
import {Loader2} from 'lucide-react'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: Array<'customer' | 'worker'>
    requireSuperuser?: boolean
    fallback?: React.ReactNode // Optional custom fallback while loading
}

/**
 * ProtectedRoute - Guards routes that require authentication.
 *
 * Architecture:
 * - useAuth (Redux): tracks token existence + login/logout state
 * - useUser (React Query): fetches user profile after login
 * - This component coordinates both to prevent race conditions
 *
 * Flow:
 * 1. Check isAuthenticated from Redux (fast, synchronous)
 * 2. If authenticated, wait for useUser to resolve (profile fetch)
 * 3. Handle useUser errors (stale token, network issues)
 * 4. Check role-based access once user data is available
 * 5. Render children only when everything is ready
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
                                                                  children,
                                                                  allowedRoles,
                                                                  requireSuperuser,
                                                              }) => {
    const {isLoading: authLoading, isAuthenticated} = useAuth()
    const {data: user, isLoading: userLoading, error: userError} = useUser()
    const location = useLocation()

    // ─── Combined loading state ────────────────────────────────────────────
    // We must wait for BOTH:
    // 1. Auth state to initialize (Redux rehydration)
    // 2. User profile to load (API call after auth confirmed)
    //
    // This prevents:
    // - Flash of "Access Denied" before auth state loads
    // - Rendering children before user role is known
    const isLoading = authLoading || (isAuthenticated && userLoading)

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            </div>
        )
    }

    // ─── Not authenticated ─────────────────────────────────────────────────
    // Redirect to login, preserving the intended destination so we can
    // redirect back after successful login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{from: location.pathname}} replace/>
    }

    // ─── User fetch error ────────────────────────────────────────────────────
    // This happens when:
    // - Token is stale/invalid (401 from /api/v1/auth/me)
    // - Network error
    // - Server error
    //
    // Strategy: redirect to login. The apiClient response interceptor
    // will handle token refresh if possible, or clear the session.
    if (userError) {
        // The error could be a 401 (unauthorized) which means token is invalid
        // In that case, the apiClient interceptor will redirect to /login
        // But we handle it here as a safety net
        return <Navigate to="/login" state={{from: location.pathname}} replace/>
    }

    // ─── User data not available (shouldn't happen if no error, but safety) ─
    if (!user) {
        return <Navigate to="/login" state={{from: location.pathname}} replace/>
    }

    // ─── Role-based access control ─────────────────────────────────────────
    if (allowedRoles && !allowedRoles.includes(user.role_type)) {
        // Role mismatch: redirect to appropriate default route
        if (user.role_type === 'worker') {
            return <Navigate to="/dashboard" replace/>
        }
        // Customer dashboard doesn't exist yet — redirect to landing
        return <Navigate to="/" replace/>
    }

    // ─── Superuser-only routes ──────────────────────────────────────────────
    // Client-side UX only — the real enforcement is server-side
    // (get_current_superuser on every admin endpoint). is_superuser is a
    // flag on top of a normal customer/worker account, not a role_type, so
    // this is a separate check from allowedRoles above.
    if (requireSuperuser && !user.is_superuser) {
        return <Navigate to="/" replace/>
    }

    // ─── All checks passed — render the protected content ──────────────────
    return <>{children}</>
}

export default ProtectedRoute