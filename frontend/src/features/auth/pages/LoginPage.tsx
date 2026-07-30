// src/features/auth/pages/LoginPage.tsx
import React from 'react'
import { LoginForm } from '@/features/auth'

export const LoginPage: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Sign in to your Fixi account
                </p>
            </div>
            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <LoginForm />
            </div>
        </div>
    </div>
)