// src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import { LoginPage, RegisterPage } from '@/features/auth'

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <LoginPage />,
    },
    {
        path: '/register',
        element: <RegisterPage />,
    },
    {
        path: '/dashboard',
        element: <Dashboard />,   // your protected route
    },
])