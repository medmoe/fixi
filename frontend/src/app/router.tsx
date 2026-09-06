import {createBrowserRouter, Navigate, RouteObject} from 'react-router-dom'
import {AuthInitializer, LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import ProtectedRoute from '@/components/ProtectedRoute.tsx'
import {JobCreateForm, JobDetailPage, JobEditForm, JobsTab} from '@/features/job'
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
            {
                path: '/dashboard',
                element: (
                    <ProtectedRoute>
                        <RoleBasedDashboard/>
                    </ProtectedRoute>
                ),
                children: [
                    {index: true, element: <CustomerProfilePage/>},
                    {path: 'account', element: <CustomerAccountPage/>},
                    {path: 'jobs', element: <CustomerJobsPage/>},
                    {path: 'jobs/create', element: <JobCreateForm/>},
                    {path: 'jobs/:id', element: <JobDetailPage/>},
                    {path: 'jobs/:id/edit', element: <JobEditForm/>},
                ]
            },

            // ═══ Public job routes — browse-all, open to everyone ═══════
            // JobsTab has no auth coupling and works standalone here exactly
            // as it does embedded in the worker dashboard. JobDetailPage
            // internally branches on auth state (see its own logic) to show
            // the right call to action — apply, log in to apply, or nothing.
            {
                path: '/jobs',
                element: <JobsTab/>
            },
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
            {path: '/jobs/create', element: <Navigate to="/dashboard/jobs/create" replace/>},
            {path: '/jobs/:id/edit', element: <Navigate to="/dashboard/jobs/:id/edit" replace/>},
        ]
    }
]

export const router = createBrowserRouter(routes)