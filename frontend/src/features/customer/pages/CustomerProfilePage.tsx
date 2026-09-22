// src/features/customer/pages/CustomerProfilePage.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Home } from 'lucide-react'

export const CustomerProfilePage: React.FC = () => {
    const {t} = useTranslation('account')

    return (
    <div className="rounded-xl border bg-card p-8 text-center">
        <Home className="mx-auto h-10 w-10 text-muted-foreground mb-3"/>
        <h3 className="font-medium text-lg">{t('customerProfile.heading')}</h3>
        <p className="text-sm text-muted-foreground mt-1">
            {t('customerProfile.subtitle')}
        </p>
    </div>
    )
}
