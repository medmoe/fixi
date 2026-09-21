// Handles push notifications while the app isn't the focused tab (backgrounded
// or closed). Firebase config isn't secret, but Vite doesn't process files in
// public/, so it can't come from import.meta.env here -- it's passed as query
// params on the registration URL instead (see src/lib/firebase.ts) and read
// back out of self.location.search below.

importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);
firebase.initializeApp({
    apiKey: params.get('apiKey'),
    authDomain: params.get('authDomain'),
    projectId: params.get('projectId'),
    messagingSenderId: params.get('messagingSenderId'),
    appId: params.get('appId'),
});

const messaging = firebase.messaging();

// Foreground messages are handled in src/lib/firebase.ts instead (the app is
// already open, so the in-app WS feed from Issue #2 covers that case) --
// this only fires when the tab isn't focused/open.
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'Fixi';
    const body = payload.notification?.body ?? '';
    self.registration.showNotification(title, {body});
});
