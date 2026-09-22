// src/features/landing/components/AudiencePitch.tsx

import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const BenefitList = ({ items }: { items: string[] }) => (
    <ul className="space-y-3" role="list">
        {items.map((item) => (
            <li key={item} className="flex items-start gap-3">
                <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" aria-hidden="true" />
                </span>
                <span className="text-sm text-muted-foreground">{item}</span>
            </li>
        ))}
    </ul>
)

export const AudiencePitch = () => {
    const {t} = useTranslation('landing')
    const customerBenefits = t('audiencePitch.customer.benefits', {returnObjects: true}) as string[]
    const workerBenefits = t('audiencePitch.worker.benefits', {returnObjects: true}) as string[]

    return (
    <section
        aria-labelledby="audience-heading"
        className="container mx-auto px-4 py-20"
    >
        <div className="text-center mb-12 space-y-3">
            <h2
                id="audience-heading"
                className="text-3xl md:text-4xl font-bold"
            >
                {t('audiencePitch.heading')}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
                {t('audiencePitch.subtitle')}
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Customers */}
            <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
                <div className="space-y-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {t('audiencePitch.customer.badge')}
                    </span>
                    <h3 className="text-2xl font-bold">{t('audiencePitch.customer.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('audiencePitch.customer.description')}
                    </p>
                </div>
                <BenefitList items={customerBenefits} />
                <Button className="w-full min-h-[44px]" asChild>
                    <Link to="/register?role=customer">
                        {t('audiencePitch.customer.cta')}
                    </Link>
                </Button>
            </div>

            {/* For Workers */}
            <div className="bg-card border rounded-2xl p-8 shadow-sm space-y-6">
                <div className="space-y-2">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                        {t('audiencePitch.worker.badge')}
                    </span>
                    <h3 className="text-2xl font-bold">{t('audiencePitch.worker.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                        {t('audiencePitch.worker.description')}
                    </p>
                </div>
                <BenefitList items={workerBenefits} />
                <Button variant="outline" className="w-full min-h-[44px]" asChild>
                    <Link to="/register?role=worker">
                        {t('audiencePitch.worker.cta')}
                    </Link>
                </Button>
            </div>
        </div>
    </section>
    )
}