// src/app/router.tsx
import {createBrowserRouter} from 'react-router-dom'
import {LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import {WorkerDashboardPage} from "@/features/worker/pages/WorkerDashboardPage.tsx";
import {AuthInitializer} from "@/features/auth/components/AuthInitializer.tsx";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";

export const router = createBrowserRouter([
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
        ]
    }
])