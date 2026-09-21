import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {renderHook} from '@testing-library/react'
import {QueryClientProvider} from '@tanstack/react-query'
import {Provider} from 'react-redux'
import type {ReactNode} from 'react'
import {createTestStore, createTestQueryClient} from '@/test/renderWithProviders'
import type {RootState} from '@/store'
import {useNotificationSocket} from '../../hooks/useNotificationSocket'
import {NOTIFICATIONS_QUERY_KEY} from '../../hooks/useNotifications'

class FakeWebSocket {
    static instances: FakeWebSocket[] = []
    url: string
    closed = false
    onmessage: ((event: {data: string}) => void) | null = null
    onclose: (() => void) | null = null

    constructor(url: string) {
        this.url = url
        FakeWebSocket.instances.push(this)
    }

    close() {
        this.closed = true
    }
}

const createWrapper = (preloadedState: Partial<RootState>) => {
    const store = createTestStore(preloadedState)
    const queryClient = createTestQueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const Wrapper = ({children}: { children: ReactNode }) => (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Provider>
    )
    return {Wrapper, invalidateSpy}
}

describe('useNotificationSocket', () => {
    beforeEach(() => {
        FakeWebSocket.instances = []
        vi.stubGlobal('WebSocket', FakeWebSocket as unknown as typeof WebSocket)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it('does not open a socket when unauthenticated', () => {
        const {Wrapper} = createWrapper({auth: {isAuthenticated: false, accessToken: null, isLoading: false}})
        renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        expect(FakeWebSocket.instances).toHaveLength(0)
    })

    it('opens a socket carrying the access token when authenticated', () => {
        const {Wrapper} = createWrapper({auth: {isAuthenticated: true, accessToken: 'abc123', isLoading: false}})
        renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        expect(FakeWebSocket.instances).toHaveLength(1)
        expect(FakeWebSocket.instances[0].url).toContain('/notifications/ws?token=abc123')
    })

    it('invalidates the notifications queries when a notification message arrives', () => {
        const {Wrapper, invalidateSpy} = createWrapper({auth: {isAuthenticated: true, accessToken: 'abc123', isLoading: false}})
        renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        const socket = FakeWebSocket.instances[0]
        socket.onmessage?.({data: JSON.stringify({type: 'notification', data: {id: 1}})})

        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: NOTIFICATIONS_QUERY_KEY})
    })

    it('ignores a malformed message instead of throwing', () => {
        const {Wrapper, invalidateSpy} = createWrapper({auth: {isAuthenticated: true, accessToken: 'abc123', isLoading: false}})
        renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        const socket = FakeWebSocket.instances[0]
        expect(() => socket.onmessage?.({data: 'not json'})).not.toThrow()
        expect(invalidateSpy).not.toHaveBeenCalled()
    })

    it('reconnects after an unexpected close', () => {
        vi.useFakeTimers()
        const {Wrapper} = createWrapper({auth: {isAuthenticated: true, accessToken: 'abc123', isLoading: false}})
        renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        expect(FakeWebSocket.instances).toHaveLength(1)
        FakeWebSocket.instances[0].onclose?.()
        vi.advanceTimersByTime(3000)

        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('closes the socket on unmount and does not reconnect', () => {
        vi.useFakeTimers()
        const {Wrapper} = createWrapper({auth: {isAuthenticated: true, accessToken: 'abc123', isLoading: false}})
        const {unmount} = renderHook(() => useNotificationSocket(), {wrapper: Wrapper})

        const socket = FakeWebSocket.instances[0]
        unmount()

        expect(socket.closed).toBe(true)

        // Simulate the browser firing onclose after the deliberate close call.
        socket.onclose?.()
        vi.advanceTimersByTime(5000)

        expect(FakeWebSocket.instances).toHaveLength(1)
    })
})
