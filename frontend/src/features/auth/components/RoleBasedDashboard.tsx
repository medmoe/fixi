// RoleBasedDashboard.tsx — thin dispatcher for the single /dashboard route.
//
// Worker: renders WorkerDashboardPage directly (it manages its own tabs
// internally, no nested routes).
//
// Customer: renders DashboardLayout, which contains its own <Outlet/> for
// the nested /dashboard/account, /dashboard/jobs, etc. routes declared in
// router.tsx. Because this branch renders no Outlet at all for workers,
// a worker navigating directly to e.g. /dashboard/jobs will still just see
// WorkerDashboardPage — the matched child route is never displayed, since
// there's no Outlet in that render tree to display it in.
import { useUser } from '@/features/user'
import { WorkerDashboardPage } from '@/features/worker/pages/WorkerDashboardPage'
import { DashboardLayout } from '@/features/auth'
import { Navigate } from 'react-router-dom'

export const RoleBasedDashboard: React.FC = () => {
    const { data: user } = useUser()

    if (!user) return <Navigate to="/login" replace />

    switch (user.role_type) {
        case 'worker':
            return <WorkerDashboardPage />
        case 'customer':
            return <DashboardLayout />
        default:
            return <Navigate to="/" replace />
    }
}