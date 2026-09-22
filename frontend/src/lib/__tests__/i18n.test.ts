import {beforeEach, describe, expect, it, vi} from 'vitest'
import i18n, {createMissingKeyHandler, createParseMissingKeyHandler} from '../i18n'

describe('i18n config', () => {
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
