import { apiSlice } from '../../../app/apiSlice';
import type { SystemsResponse } from '../types';

export const systemApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSystems: builder.query<SystemsResponse, void>({
      query: () => '/systems',
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((system) => ({ type: 'System' as const, id: system.id })),
              { type: 'System' as const, id: 'LIST' }
            ]
          : [{ type: 'System' as const, id: 'LIST' }]
    })
  })
});

export const { useGetSystemsQuery } = systemApi;
