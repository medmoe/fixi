import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@testing-library/react'
import {QueryClient} from '@tanstack/react-query'
import {useChangeLanguage} from '../../hooks/useChangeLanguage'
import {useUpdateUser, useUser} from '@/features/user'
import i18n from '@/lib/i18n'
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx'

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
    useUpdateUser: vi.fn(),
}))

const updateUserMock = vi.fn()

describe('useChangeLanguage', () => {
    let queryClient: QueryClient

    beforeEach(async () => {
        vi.clearAllMocks()
        queryClient = createQueryClient()
        vi.mocked(useUpdateUser).mockReturnValue({mutate: updateUserMock} as never)
        await i18n.changeLanguage('fr')
    })

    afterEach(async () => {
        await i18n.changeLanguage('fr')
    })

    it('switches the active language immediately', async () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'fr'}} as never)
        const {result} = renderHook(() => useChangeLanguage(), {wrapper: createWrapper(queryClient)})

        result.current('ar')

        await vi.waitFor(() => expect(i18n.language).toBe('ar'))
    })

    it('persists the choice for a logged-in user whose preference differs', () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'fr'}} as never)
        const {result} = renderHook(() => useChangeLanguage(), {wrapper: createWrapper(queryClient)})

        result.current('ar')

        expect(updateUserMock).toHaveBeenCalledWith({preferred_language: 'ar'})
    })

    it('persists English as a preference too', async () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'fr'}} as never)
        const {result} = renderHook(() => useChangeLanguage(), {wrapper: createWrapper(queryClient)})

        result.current('en')

        await vi.waitFor(() => expect(i18n.language).toBe('en'))
        expect(updateUserMock).toHaveBeenCalledWith({preferred_language: 'en'})
    })

    it('does not call the update mutation when the choice already matches the stored preference', () => {
        vi.mocked(useUser).mockReturnValue({data: {username: 'jane', preferred_language: 'ar'}} as never)
        const {result} = renderHook(() => useChangeLanguage(), {wrapper: createWrapper(queryClient)})

        result.current('ar')

        expect(updateUserMock).not.toHaveBeenCalled()
    })

    it('does not persist anything for a logged-out visitor', async () => {
        vi.mocked(useUser).mockReturnValue({data: undefined} as never)
        const {result} = renderHook(() => useChangeLanguage(), {wrapper: createWrapper(queryClient)})

        result.current('ar')

        await vi.waitFor(() => expect(i18n.language).toBe('ar'))
        expect(updateUserMock).not.toHaveBeenCalled()
    })
})
