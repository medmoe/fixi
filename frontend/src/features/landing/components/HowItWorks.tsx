// src/features/landing/components/HowItWorks.tsx

import { UserPlus, Users, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const STEPS = [
    {icon: UserPlus, key: 'join', step: '01'},
    {icon: Users, key: 'connect', step: '02'},
    {icon: Star, key: 'complete', step: '03'},
] as const

export const HowItWorks = () => {
    const {t} = useTranslation('landing')

    return (
    <section
        aria-labelledby="how-it-works-heading"
        className="bg-muted/40 py-20"
    >
        <div className="container mx-auto px-4">
            <div className="text-center mb-12 space-y-3">
                <h2
                    id="how-it-works-heading"
                    className="text-3xl md:text-4xl font-bold"
                >
                    {t('howItWorks.heading')}
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                    {t('howItWorks.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {STEPS.map(({ icon: Icon, key, step }) => (
                    <div
                        key={step}
                        className="relative bg-card border rounded-2xl p-6 shadow-sm flex flex-col gap-4"
                    >
                        <span
                            className="absolute top-4 right-4 text-5xl font-black text-primary/10 select-none"
                            aria-hidden="true"
                        >
                            {step}
                        </span>
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-semibold">{t(`howItWorks.steps.${key}.title`)}</h3>
                        <p className="text-sm text-muted-foreground">{t(`howItWorks.steps.${key}.description`)}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
    )
}