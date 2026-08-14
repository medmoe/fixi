// src/app/router.tsx
import {createBrowserRouter, RouteObject} from 'react-router-dom'
import {LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import {WorkerDashboardPage} from "@/features/worker/pages/WorkerDashboardPage.tsx";
import {AuthInitializer} from "@/features/auth/components/AuthInitializer.tsx";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import {MyJobsPage} from "@/features/job/pages/MyJobsPage.tsx";
import {JobDetailPage} from "@/features/job/pages/JobDetailPage.tsx";
import {JobEditForm} from "@/features/job/components/JobEditForm.tsx";

export const routes: RouteObject[] = [
    {
        element: <AuthInitializer/>,
        children: [
            {
                path: '/',
                element: <LandingPage/>,
            },
            {
                path: '/login',
                element: <LoginPage/>,
            },
            {
                path: '/register',
                element: <RegisterPage/>,
            },
            {
                path: '/dashboard',
                element: (
                    <ProtectedRoute allowedRoles={["worker"]}>
                        <WorkerDashboardPage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/jobs',
                element: (
                    <ProtectedRoute allowedRoles={['customer']}>
                        <MyJobsPage/>
                    </ProtectedRoute>
                )
            },
            {
                path: '/jobs/:id',
                element: <JobDetailPage/>
            },
            {
                path: '/jobs/:id/edit',
                element: (
                    <ProtectedRoute allowedRoles={['customer']}>
                        <JobEditForm/>
                    </ProtectedRoute>
                )
            }
        ]
    }

]

export const router = createBrowserRouter(routes)