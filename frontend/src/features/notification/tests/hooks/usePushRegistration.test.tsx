import {beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook, waitFor} from '@testing-library/react'
import {QueryClientProvider} from '@tanstack/react-query'
import {Provider} from 'react-redux'
import type {ReactNode} from 'react'
import {createTestStore, createTestQueryClient} from '@/test/renderWithProviders'
import type {RootState} from '@/store'
import {usePushRegistration} from '../../hooks/usePushRegistration'
import {notificationApi} from '@/lib/api/notificationApi'
import {getWebPushToken} from '@/lib/firebase'

vi.mock('@/lib/firebase', () => ({
    getWebPushToken: vi.fn(),
}))

vi.mock('@/lib/api/notificationApi', () => ({
    notificationApi: {
        registerDeviceToken: vi.fn(),
    },
}))

const createWrapper = (preloadedState: Partial<RootState>) => {
    const store = createTestStore(preloadedState)
    const queryClient = createTestQueryClient()
    const Wrapper = ({children}: { children: ReactNode }) => (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Provider>
    )
    return Wrapper
}

describe('usePushRegistration', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(notificationApi.registerDeviceToken).mockResolvedValue({
            id: 1, user_id: 1, token: 'token-abc', platform: 'web', last_seen: '2026-01-01T00:00:00Z',
        })
    })

    it('does nothing when unauthenticated', async () => {
        vi.mocked(getWebPushToken).mockResolvedValue('token-abc')
        const Wrapper = createWrapper({auth: {isAuthenticated: false, accessToken: null, isLoading: false}})

        renderHook(() => usePushRegistration(), {wrapper: Wrapper})

        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(getWebPushToken).not.toHaveBeenCalled()
    })

    it('registers the device token when authenticated and a token is available', async () => {
        vi.mocked(getWebPushToken).mockResolvedValue('token-abc')
        const Wrapper = createWrapper({auth: {isAuthenticated: true, accessToken: 'jwt', isLoading: false}})

        renderHook(() => usePushRegistration(), {wrapper: Wrapper})

        await waitFor(() => expect(notificationApi.registerDeviceToken).toHaveBeenCalledWith('token-abc', 'web'))
    })

    it('does not register anything when getWebPushToken resolves to null', async () => {
        vi.mocked(getWebPushToken).mockResolvedValue(null)
        const Wrapper = createWrapper({auth: {isAuthenticated: true, accessToken: 'jwt', isLoading: false}})

        renderHook(() => usePushRegistration(), {wrapper: Wrapper})

        await waitFor(() => expect(getWebPushToken).toHaveBeenCalled())
        expect(notificationApi.registerDeviceToken).not.toHaveBeenCalled()
    })

    it('only attempts registration once even if the component re-renders', async () => {
        vi.mocked(getWebPushToken).mockResolvedValue('token-abc')
        const Wrapper = createWrapper({auth: {isAuthenticated: true, accessToken: 'jwt', isLoading: false}})

        const {rerender} = renderHook(() => usePushRegistration(), {wrapper: Wrapper})
        await waitFor(() => expect(getWebPushToken).toHaveBeenCalledTimes(1))

        rerender()
        rerender()

        await new Promise((resolve) => setTimeout(resolve, 0))
        expect(getWebPushToken).toHaveBeenCalledTimes(1)
    })
})
