import { apiSlice } from '../../../app/apiSlice';
import type { AuthToken, LoginRequest, RegisterRequest, RegisterResponse, UserRead } from '../types';

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<RegisterResponse, RegisterRequest>({
      query: (payload) => ({
        url: '/auth/register',
        method: 'POST',
        body: payload
      })
    }),
    login: builder.mutation<AuthToken, LoginRequest>({
      query: (payload) => ({
        url: '/auth/login',
        method: 'POST',
        body: payload
      })
    }),
    refresh: builder.mutation<AuthToken, void>({
      query: () => ({
        url: '/refresh',
        method: 'POST'
      })
    }),
    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/logout',
        method: 'POST'
      })
    }),
    getMe: builder.query<UserRead, void>({
      query: () => ({
        url: '/user/me/'
      }),
      providesTags: ['User']
    })
  })
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery
} = authApi;
