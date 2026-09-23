import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {act, renderHook} from '@testing-library/react'
import {useFormatCurrency, useFormatDate, useFormatNumber} from '../useFormatters'
import i18n from '@/lib/i18n'

describe('useFormatCurrency', () => {
    afterEach(async () => {
        await act(async () => {
            await i18n.changeLanguage('fr')
        })
    })

    it('formats USD amounts for English', async () => {
        await i18n.changeLanguage('en')
        const {result} = renderHook(() => useFormatCurrency())
        expect(result.current(75)).toBe('$75.00')
        expect(result.current(18.5)).toBe('$18.50')
    })

    it('formats USD amounts for French using French punctuation', async () => {
        await i18n.changeLanguage('fr')
        const {result} = renderHook(() => useFormatCurrency())
        expect(result.current(75)).toBe('75,00 $US')
    })

    it('formats USD amounts for Arabic using Western digits', async () => {
        await i18n.changeLanguage('ar')
        const {result} = renderHook(() => useFormatCurrency())
        expect(result.current(75)).toContain('75,00')
        expect(result.current(75)).not.toMatch(/[٠-٩]/)
    })

    it('falls back to the French locale for an unrecognized language', async () => {
        await i18n.changeLanguage('es')
        const {result} = renderHook(() => useFormatCurrency())
        expect(result.current(75)).toBe('75,00 $US')
    })
})

describe('useFormatNumber', () => {
    afterEach(async () => {
        await act(async () => {
            await i18n.changeLanguage('fr')
        })
    })

    it('formats a plain number for English', async () => {
        await i18n.changeLanguage('en')
        const {result} = renderHook(() => useFormatNumber())
        expect(result.current(4.5)).toBe('4.5')
    })

    it('respects passed-through Intl.NumberFormat options', async () => {
        await i18n.changeLanguage('en')
        const {result} = renderHook(() => useFormatNumber())
        expect(result.current(4.5, {minimumFractionDigits: 1, maximumFractionDigits: 1})).toBe('4.5')
        expect(result.current(4, {minimumFractionDigits: 1, maximumFractionDigits: 1})).toBe('4.0')
    })

    it('uses Western digits in Arabic (comma decimal separator, per Algerian French-influenced convention)', async () => {
        await i18n.changeLanguage('ar')
        const {result} = renderHook(() => useFormatNumber())
        expect(result.current(4.5)).toBe('4,5')
        expect(result.current(4.5)).not.toMatch(/[٠-٩]/)
    })
})

describe('useFormatDate', () => {
    beforeEach(async () => {
        await i18n.changeLanguage('en')
    })

    afterEach(async () => {
        await act(async () => {
            await i18n.changeLanguage('fr')
        })
    })

    it('formats a plain date for English by default', () => {
        const {result} = renderHook(() => useFormatDate())
        expect(result.current('2024-01-15T10:00:00Z')).toBe('1/15/2024')
    })

    it('accepts a Date instance', () => {
        const {result} = renderHook(() => useFormatDate())
        expect(result.current(new Date('2024-01-15T10:00:00Z'))).toBe('1/15/2024')
    })

    it('respects passed-through Intl.DateTimeFormatOptions', () => {
        const {result} = renderHook(() => useFormatDate())
        expect(result.current('2026-09-21T10:00:00Z', {dateStyle: 'medium'})).toBe('Sep 21, 2026')
    })

    it('formats dates for French using French month names', async () => {
        await i18n.changeLanguage('fr')
        const {result} = renderHook(() => useFormatDate())
        expect(result.current('2026-09-21T10:00:00Z', {dateStyle: 'long'})).toBe('21 septembre 2026')
    })
})
