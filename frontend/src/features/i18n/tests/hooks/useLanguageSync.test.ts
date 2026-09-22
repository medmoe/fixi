import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useLanguageSync} from '../../hooks/useLanguageSync'
import {useUser} from '@/features/user'
import i18n from '@/lib/i18n'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
}))

describe('useLanguageSync', () => {
    let queryClient: QueryClient

    beforeEach(async () => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
        await i18n.changeLanguage('fr')
    })

    afterEach(async () => {
        // vi.spyOn(i18n, ...) below permanently wraps the method until
        // restored -- without this, a leftover spy from one test records
        // the *next* test's own beforeEach housekeeping call as if it were
        // something the hook did.
        vi.restoreAllMocks()
        await i18n.changeLanguage('fr')
    })

    it('switches to the user preferred_language when it differs from the active language', async () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'ar'}} as never)

        renderHook(() => useLanguageSync(), {wrapper: createWrapper(queryClient)})

        await vi.waitFor(() => expect(i18n.language).toBe('ar'))
    })

    it('switches to English when that is the stored preference', async () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'en'}} as never)

        renderHook(() => useLanguageSync(), {wrapper: createWrapper(queryClient)})

        await vi.waitFor(() => expect(i18n.language).toBe('en'))
    })

    it('does nothing when preferred_language already matches the active language', async () => {
        const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage')
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'fr'}} as never)

        renderHook(() => useLanguageSync(), {wrapper: createWrapper(queryClient)})

        expect(changeLanguageSpy).not.toHaveBeenCalled()
    })

    it('does nothing when logged out (no user data)', () => {
        const changeLanguageSpy = vi.spyOn(i18n, 'changeLanguage')
        vi.mocked(useUser).mockReturnValue({data: undefined} as never)

        renderHook(() => useLanguageSync(), {wrapper: createWrapper(queryClient)})

        expect(changeLanguageSpy).not.toHaveBeenCalled()
    })
})
