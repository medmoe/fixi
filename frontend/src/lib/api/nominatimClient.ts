import type {AxiosInstance} from 'axios'
import axios from 'axios'

// ─── Nominatim (OpenStreetMap geocoding) ──────────────────────────────────────
// A separate client from apiClient on purpose: this is a third-party service, so
// it must never receive our access token or the httpOnly refresh_token cookie,
// and its 401s must not trigger our silent-refresh interceptor.
//
// Nominatim's usage policy asks callers to identify themselves. Browsers forbid
// setting User-Agent from JS, but they send Referer automatically, which satisfies
// the policy for browser-based apps. The policy also caps traffic at 1 req/s —
// useLocationSearch debounces and caches to stay under that.

export const NOMINATIM_BASE_URL =
    import.meta.env.VITE_NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org'

const nominatimClient: AxiosInstance = axios.create({
    baseURL: NOMINATIM_BASE_URL,
    withCredentials: false,
    headers: {
        Accept: 'application/json',
    },
})

export default nominatimClient
