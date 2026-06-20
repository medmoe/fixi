import {createApi, fetchBaseQuery} from '@reduxjs/toolkit/query/react';
import type {BaseQueryFn, FetchArgs, FetchBaseQueryError} from '@reduxjs/toolkit/query';
import type {RootState} from './store';
import {clearCredentials, setCredentials} from '../features/auth/authSlice';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    credentials: 'include', // sends cookies with every request
    prepareHeaders: (headers, {getState}) => {
        const token = (getState() as RootState).auth.accessToken;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`); // attach JWT
        }
        return headers;
    }
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
    args,
    api,
    extraOptions
) => {
    /*
    Every API call goes through this flow:
    1. Make the original request
         ↓
    2. Did it fail with 401 or 403?
     (token expired or unauthorized)
         ↓
    3. Try to get a new access token via /refresh
         ↓
    4a. Refresh succeeded? → retry original request with new token
    4b. Refresh failed?    → logout user (clearCredentials)
    * */
    let result = await rawBaseQuery(args, api, extraOptions);
    const requestUrl = typeof args === 'string' ? args : args.url;
    const shouldSkipRefresh = ['/auth/login', '/auth/register', '/refresh'].some((path) => requestUrl.includes(path)); // prevents infinite loops

    if (!shouldSkipRefresh && result.error && (result.error.status === 401 || result.error.status === 403)) {
        const refreshResult = await rawBaseQuery({url: '/refresh', method: 'POST'}, api, extraOptions);
        if (refreshResult.data && typeof refreshResult.data === 'object' && 'access_token' in refreshResult.data) {
            api.dispatch(setCredentials({accessToken: (refreshResult.data as { access_token: string }).access_token}));
            result = await rawBaseQuery(args, api, extraOptions);
        } else {
            api.dispatch(clearCredentials());
        }
    }
    return result;
};

export const apiSlice = createApi({
    reducerPath: 'api', // key in redux store
    baseQuery: baseQueryWithReauth, // use our smart base query
    tagTypes: ['System', 'User', 'Jobs'], // cache invalidation tags
    endpoints: () => ({}) // empty here, extended in feature files
});
