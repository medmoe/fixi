import {beforeEach, describe, expect, it, vi} from 'vitest'
import i18n, {createMissingKeyHandler, createParseMissingKeyHandler, getDirection} from '../i18n'

describe('i18n config', () => {
    describe('getDirection', () => {
        it('is rtl for Arabic', () => {
            expect(getDirection('ar')).toBe('rtl')
        })

        it('is ltr for French', () => {
            expect(getDirection('fr')).toBe('ltr')
        })

        it('is ltr for English', () => {
            expect(getDirection('en')).toBe('ltr')
        })

        it('defaults to ltr for an unrecognized language code', () => {
            expect(getDirection('xx')).toBe('ltr')
        })
    })

    describe('document direction on language change', () => {
        it('sets both dir and lang to rtl/ar when switching to Arabic', async () => {
            await i18n.changeLanguage('ar')
            expect(document.documentElement.dir).toBe('rtl')
            expect(document.documentElement.lang).toBe('ar')
        })

        it('sets both dir and lang back to ltr/fr when switching to French', async () => {
            await i18n.changeLanguage('ar')
            await i18n.changeLanguage('fr')
            expect(document.documentElement.dir).toBe('ltr')
            expect(document.documentElement.lang).toBe('fr')
        })
    })
    describe('createParseMissingKeyHandler', () => {
        it('returns the raw key in dev -- loud for developers', () => {
            const handler = createParseMissingKeyHandler(true)
            expect(handler('some.missing.key')).toBe('some.missing.key')
        })

        it('returns an empty string outside dev -- never a raw key for a real user', () => {
            const handler = createParseMissingKeyHandler(false)
            expect(handler('some.missing.key')).toBe('')
        })
    })

    describe('createMissingKeyHandler', () => {
        it('warns in dev', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
            const handler = createMissingKeyHandler(true)

            handler(['fr'], 'common', 'some.missing.key')

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('some.missing.key'))
            warnSpy.mockRestore()
        })

        it('does not warn outside dev', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
            const handler = createMissingKeyHandler(false)

            handler(['fr'], 'common', 'some.missing.key')

            expect(warnSpy).not.toHaveBeenCalled()
            warnSpy.mockRestore()
        })
    })

    describe('fallback chain', () => {
        beforeEach(async () => {
            await i18n.changeLanguage('ar')
        })

        it('falls back to French when a key exists there but not in the active (Arabic) bundle', () => {
            i18n.addResourceBundle('fr', 'common', {onlyInFrench: 'Texte français'}, true, true)

            expect(i18n.t('onlyInFrench')).toBe('Texte français')
        })

        it('renders real seeded keys in Arabic without falling back', () => {
            expect(i18n.t('language.switcherLabel')).toBe('تغيير اللغة')
        })

        it('falls back to French for English too when a key is missing there', async () => {
            await i18n.changeLanguage('en')
            i18n.addResourceBundle('fr', 'common', {onlyInFrenchForEnglishTest: 'Texte français'}, true, true)

            expect(i18n.t('onlyInFrenchForEnglishTest')).toBe('Texte français')
        })

        it('renders real seeded keys in English without falling back', async () => {
            await i18n.changeLanguage('en')

            expect(i18n.t('language.switcherLabel')).toBe('Change language')
        })
    })
})
