import {useEffect, useRef} from 'react'
import {useMutation} from '@tanstack/react-query'
import {notificationApi} from '@/lib/api/notificationApi'
import {getWebPushToken} from '@/lib/firebase'
import {useAppSelector} from '@/store/hooks'

/**
 * Requests notification permission and registers this browser's FCM token
 * with the backend once per authenticated session. A no-op wherever push
 * isn't configured (missing VITE_FIREBASE_* env vars), unsupported, or
 * declined -- push is always an enhancement, never a requirement.
 */
export const usePushRegistration = () => {
    const {isAuthenticated} = useAppSelector((state) => state.auth)
    const hasAttempted = useRef(false)

    const {mutate: registerToken} = useMutation({
        mutationFn: (token: string) => notificationApi.registerDeviceToken(token, 'web'),
    })

    useEffect(() => {
        if (!isAuthenticated || hasAttempted.current) return
        hasAttempted.current = true

        getWebPushToken().then((token) => {
            if (token) registerToken(token)
        })
    }, [isAuthenticated, registerToken])
}
