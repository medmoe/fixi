import React from 'react'
import {useTranslation} from 'react-i18next'
import {Languages} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu'
import {SUPPORTED_LANGUAGES, type SupportedLanguage} from '@/lib/i18n'
import {useChangeLanguage} from '../hooks/useChangeLanguage'

export const LanguageSwitcher: React.FC = () => {
    const {t, i18n} = useTranslation()
    const changeLanguage = useChangeLanguage()

    const activeLanguage = (i18n.resolvedLanguage ?? i18n.language) as SupportedLanguage

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('language.switcherLabel')}>
                    <Languages className="h-5 w-5"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {SUPPORTED_LANGUAGES.map((language) => (
                    <DropdownMenuItem
                        key={language}
                        onClick={() => changeLanguage(language)}
                        aria-current={language === activeLanguage}
                        className={language === activeLanguage ? 'font-semibold' : undefined}
                    >
                        {t(`language.${language}`)}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
