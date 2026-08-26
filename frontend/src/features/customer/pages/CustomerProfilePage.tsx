// src/features/customer/pages/CustomerProfilePage.tsx
import React from 'react'
import { Home } from 'lucide-react'

export const CustomerProfilePage: React.FC = () => (
    <div className="rounded-xl border bg-card p-8 text-center">
        <Home className="mx-auto h-10 w-10 text-muted-foreground mb-3"/>
        <h3 className="font-medium text-lg">Customer Profile</h3>
        <p className="text-sm text-muted-foreground mt-1">
            Coming soon — manage your address, preferences, and account details.
        </p>
    </div>
)