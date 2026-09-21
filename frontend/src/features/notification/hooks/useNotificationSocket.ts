import {useEffect, useRef} from 'react'
import {useQueryClient} from '@tanstack/react-query'
import apiClient from '@/lib/api/apiClient'
import {useAppSelector} from '@/store/hooks'
import type {NotificationSocketMessage} from '../types'
import {NOTIFICATIONS_QUERY_KEY} from './useNotifications'

const RECONNECT_DELAY_MS = 3000

const buildWsUrl = (token: string): string => {
    const httpBaseUrl = apiClient.defaults.baseURL ?? 'http://localhost:8000/api/v1'
    const wsBaseUrl = httpBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '')
    return `${wsBaseUrl}/notifications/ws?token=${encodeURIComponent(token)}`
}

/**
 * Keeps a live WebSocket connection to /notifications/ws open while
 * authenticated. On every push, invalidates the notifications queries so
 * the bell badge and dropdown refresh without a page reload — reconnects
 * automatically (fixed delay) if the connection drops unexpectedly.
 */
export const useNotificationSocket = () => {
    const queryClient = useQueryClient()
    const {isAuthenticated, accessToken} = useAppSelector((state) => state.auth)
    const socketRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        if (!isAuthenticated || !accessToken) return

        let reconnectTimer: ReturnType<typeof setTimeout> | undefined
        let stopped = false

        const connect = () => {
            const socket = new WebSocket(buildWsUrl(accessToken))
            socketRef.current = socket

            socket.onmessage = (event) => {
                try {
                    const message: NotificationSocketMessage = JSON.parse(event.data)
                    if (message.type === 'notification') {
                        queryClient.invalidateQueries({queryKey: NOTIFICATIONS_QUERY_KEY})
                    }
                } catch {
                    // Ignore malformed frames rather than crash the socket handler.
                }
            }

            socket.onclose = () => {
                if (!stopped) {
                    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
                }
            }
        }

        connect()

        return () => {
            stopped = true
            clearTimeout(reconnectTimer)
            socketRef.current?.close()
            socketRef.current = null
        }
    }, [isAuthenticated, accessToken, queryClient])
}
