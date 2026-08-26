// src/app/router.tsx
import {createBrowserRouter, Navigate, RouteObject} from 'react-router-dom'
import {AuthInitializer, LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import ProtectedRoute from '@/components/ProtectedRoute.tsx'
import {JobCreateForm, JobDetailPage, JobEditForm} from '@/features/job'
import {WorkerDetailPage, WorkerSearchPage} from '@/features/worker'
import {RoleBasedDashboard} from '@/features/auth/components/RoleBasedDashboard.tsx'
import {CustomerAccountPage, CustomerJobsPage, CustomerProfilePage} from "@/features/customer";

export const routes: RouteObject[] = [
    {
        element: <AuthInitializer/>,
        children: [
            {path: '/', element: <LandingPage/>},
            {path: '/login', element: <LoginPage/>},
            {path: '/register', element: <RegisterPage/>},

            // ═══ Single /dashboard entry — dispatches by role ═══════════
            // RoleBasedDashboard renders WorkerDashboardPage (flat, no
            // nested routes) or DashboardLayout (renders <Outlet/> for the
            // customer children below). No allowedRoles restriction here —
            // any authenticated user may hit /dashboard; the dispatcher
            // itself decides what that means per-role.
            {
                path: '/dashboard',
                element: (
                    <ProtectedRoute>
                        <RoleBasedDashboard/>
                    </ProtectedRoute>
                ),
                children: [
                    // Only ever rendered when RoleBasedDashboard renders
                    // DashboardLayout (i.e. customer) — DashboardLayout's
                    // own <Outlet/> is what displays these. For workers,
                    // no Outlet exists in the tree, so these never render
                    // regardless of URL.
                    {index: true, element: <CustomerProfilePage/>},
                    {path: 'account', element: <CustomerAccountPage/>},
                    {path: 'jobs', element: <CustomerJobsPage/>},
                    {path: 'jobs/create', element: <JobCreateForm/>},
                    {path: 'jobs/:id', element: <JobDetailPage/>},
                    {path: 'jobs/:id/edit', element: <JobEditForm/>},
                ]
            },

            // ═══ Standalone job routes (workers or public view) ═════════
            {
                path: '/jobs/:id',
                element: <JobDetailPage/>
            },
            {
                path: '/workers/search',
                element: <WorkerSearchPage/>
            },
            {
                path: '/workers/:workerId',
                element: <WorkerDetailPage/>
            },

            // ═══ Redirect old standalone customer routes ═════════════════
            {path: '/jobs', element: <Navigate to="/dashboard/jobs" replace/>},
            {path: '/jobs/create', element: <Navigate to="/dashboard/jobs/create" replace/>},
            {path: '/jobs/:id/edit', element: <Navigate to="/dashboard/jobs/:id/edit" replace/>},
        ]
    }
]

export const router = createBrowserRouter(routes)