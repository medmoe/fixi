import {initializeApp, type FirebaseApp} from 'firebase/app'
import {getMessaging, getToken, isSupported, onMessage, type Messaging} from 'firebase/messaging'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY

const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean) && !!vapidKey

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

const getFirebaseApp = (): FirebaseApp => {
    if (!app) app = initializeApp(firebaseConfig)
    return app
}

/**
 * Registers the service worker, requests notification permission, and
 * returns an FCM registration token -- or null if push isn't configured,
 * unsupported in this browser, or the user declines permission. Never
 * throws; callers should treat push as an optional enhancement.
 */
export const getWebPushToken = async (): Promise<string | null> => {
    if (!isFirebaseConfigured) return null
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return null

    try {
        if (!(await isSupported())) return null

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return null

        // Non-null: isFirebaseConfigured already guaranteed every field is a
        // non-empty string before we got here.
        const swParams = new URLSearchParams({
            apiKey: firebaseConfig.apiKey!,
            authDomain: firebaseConfig.authDomain!,
            projectId: firebaseConfig.projectId!,
            messagingSenderId: firebaseConfig.messagingSenderId!,
            appId: firebaseConfig.appId!,
        })
        const registration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${swParams}`)

        if (!messaging) messaging = getMessaging(getFirebaseApp())

        return await getToken(messaging, {
            vapidKey: vapidKey!,
            serviceWorkerRegistration: registration,
        })
    } catch {
        // Permission denied, unsupported browser, network hiccup, etc. --
        // push is an enhancement, never something worth surfacing as an error.
        return null
    }
}

/**
 * Foreground push messages arrive here (background ones go through the
 * service worker instead). The in-app WS feed already covers the
 * tab-is-open case, so this deliberately does nothing by default --
 * exposed for callers that want to react to it anyway (e.g. a future
 * "you have a new notification" toast).
 */
export const onForegroundPushMessage = async (callback: (payload: unknown) => void): Promise<() => void> => {
    if (!isFirebaseConfigured || !(await isSupported())) return () => {}
    if (!messaging) messaging = getMessaging(getFirebaseApp())
    return onMessage(messaging, callback)
}
