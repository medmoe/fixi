// src/app/router.tsx
import {createBrowserRouter} from 'react-router-dom'
import {LoginPage, RegisterPage} from '@/features/auth'
import {LandingPage} from '@/features/landing'
import {WorkerDashboardPage} from "@/features/worker/pages/WorkerDashboardPage.tsx";

export const router = createBrowserRouter([
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
        element: <WorkerDashboardPage />,   // your protected route
    },
])