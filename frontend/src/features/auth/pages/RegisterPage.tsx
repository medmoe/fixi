// src/features/auth/pages/RegisterPage.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { RegisterForm } from '../components/RegisterForm'

export const RegisterPage: React.FC = () => {
    const {t} = useTranslation('auth')

    return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">{t('registerPage.heading')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('registerPage.subtitle')}
                </p>
            </div>
            <div className="bg-card border rounded-xl p-8 shadow-sm">
                <RegisterForm />
            </div>
        </div>
    </div>
    )
}
