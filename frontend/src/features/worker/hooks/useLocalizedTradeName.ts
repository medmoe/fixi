import {useTranslation} from 'react-i18next'

interface LocalizableTradeName {
    display_name: string | null
    display_name_ar?: string | null
    display_name_fr?: string | null
}

/**
 * Resolves a trade category's name in the active UI language. Falls back to
 * `display_name` (English, the only field guaranteed non-null) when the
 * active language is ar/fr but that specific category hasn't been
 * translated yet -- same "never show nothing" fallback policy as the rest
 * of the app's i18n.
 */
export const useLocalizedTradeName = () => {
    const {i18n} = useTranslation()

    return (trade: LocalizableTradeName | null | undefined): string => {
        if (!trade) return ''
        if (i18n.language === 'ar' && trade.display_name_ar) return trade.display_name_ar
        if (i18n.language === 'fr' && trade.display_name_fr) return trade.display_name_fr
        return trade.display_name ?? ''
    }
}
