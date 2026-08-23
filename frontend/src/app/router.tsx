// src/app/router.tsx
import {createBrowserRouter, RouteObject} from 'react-router-dom'
import {AuthInitializer, LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import {JobCreateForm, JobDetailPage, JobEditForm, MyJobsPage} from "@/features/job";
import {WorkerDashboardPage, WorkerDetailPage, WorkerSearchPage} from "@/features/worker";

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
                path: '/jobs/create',
                element: (
                    <ProtectedRoute allowedRoles={['customer']}>
                        <JobCreateForm/>
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
            },
            {
                path: '/workers/search',
                element: <WorkerSearchPage/>
            },
            {
                path: '/workers/:workerId',
                element: <WorkerDetailPage/>
            }
        ]
    }

]

export const router = createBrowserRouter(routes)