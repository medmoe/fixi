// src/features/landing/components/Footer.tsx

import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export const Footer = () => {
    const {t} = useTranslation('landing')

    return (
    <footer className="border-t bg-muted/40 py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <Link
                to="/"
                className="flex items-center gap-2 font-bold text-lg text-primary"
                aria-label={t('footer.logoAriaLabel')}
            >
                <Zap className="h-5 w-5" aria-hidden="true" />
                Fixi
            </Link>
            <p className="text-xs text-muted-foreground">
                {t('footer.copyright', {year: new Date().getFullYear()})}
            </p>
            <nav aria-label={t('footer.navAriaLabel')} className="flex gap-4">
                <Link
                    to="/login"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {t('footer.logIn')}
                </Link>
                <Link
                    to="/register"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {t('footer.signUp')}
                </Link>
            </nav>
        </div>
    </footer>
    )
}