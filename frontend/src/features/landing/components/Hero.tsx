// src/features/landing/components/Hero.tsx

import { Link } from 'react-router-dom'
import { ArrowRight, Wrench, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

export const Hero = () => {
    const {t} = useTranslation('landing')

    return (
    <section
        aria-labelledby="hero-heading"
        className="container mx-auto px-4 py-20 md:py-32 flex flex-col items-center text-center gap-8"
    >
        <div className="space-y-4 max-w-3xl">
            <h1
                id="hero-heading"
                className="text-4xl md:text-6xl font-bold tracking-tight leading-tight"
            >
                {t('hero.headingPrefix')}{" "}
                <span className="text-primary"> {t('hero.headingHighlight')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                {t('hero.subtitle')}
            </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button size="lg" className="gap-2 min-h-[44px] w-full sm:w-auto" asChild>
                <Link to="/register?role=customer">
                    <Search className="h-5 w-5" aria-hidden="true" />
                    {t('hero.findProfessional')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </Button>
            <Button
                size="lg"
                variant="outline"
                className="gap-2 min-h-[44px] w-full sm:w-auto"
                asChild
            >
                <Link to="/register?role=worker">
                    <Wrench className="h-5 w-5" aria-hidden="true" />
                    {t('hero.offerServices')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            </Button>
        </div>

        {/* Illustration placeholder */}
        <div
            className="w-full max-w-2xl h-64 md:h-80 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center mt-4"
            aria-hidden="true"
        >
            <p className="text-muted-foreground text-sm">
                {t('hero.illustrationPlaceholder')}
            </p>
        </div>
    </section>
    )
}