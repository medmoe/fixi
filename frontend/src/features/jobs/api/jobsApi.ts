import { apiSlice } from '../../../app/apiSlice';
import type { JobAssign, JobCreate, JobRead, JobStatusUpdate, NearbyJobRead } from '../types';
import type { ReviewCreate, ReviewRead, ReviewUpdate } from '../reviewsTypes';

export const jobsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createJob: builder.mutation<JobRead, JobCreate>({
      query: (payload) => ({
        url: '/jobs',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Jobs']
    }),
    getMyJobs: builder.query<JobRead[], void>({
      query: () => ({
        url: '/jobs/me'
      }),
      providesTags: ['Jobs']
    }),
    getJob: builder.query<JobRead, number>({
      query: (jobId) => ({
        url: `/jobs/${jobId}`
      }),
      providesTags: ['Jobs']
    }),
    assignJob: builder.mutation<JobRead, { jobId: number; payload: JobAssign }>({
      query: ({ jobId, payload }) => ({
        url: `/jobs/${jobId}/assign`,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['Jobs']
    }),
    updateJobStatus: builder.mutation<JobRead, { jobId: number; payload: JobStatusUpdate }>({
      query: ({ jobId, payload }) => ({
        url: `/jobs/${jobId}/status`,
        method: 'PATCH',
        body: payload
      }),
      invalidatesTags: ['Jobs']
    }),
    acceptJob: builder.mutation<JobRead, number>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/accept`,
        method: 'POST'
      }),
      invalidatesTags: ['Jobs']
    }),
    completeJob: builder.mutation<JobRead, number>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/complete`,
        method: 'POST'
      }),
      invalidatesTags: ['Jobs']
    }),
    getJobReview: builder.query<ReviewRead, number>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/review`
      })
    }),
    createJobReview: builder.mutation<ReviewRead, { jobId: number; payload: ReviewCreate }>({
      query: ({ jobId, payload }) => ({
        url: `/jobs/${jobId}/review`,
        method: 'POST',
        body: payload
      })
    }),
    updateJobReview: builder.mutation<ReviewRead, { jobId: number; payload: ReviewUpdate }>({
      query: ({ jobId, payload }) => ({
        url: `/jobs/${jobId}/review`,
        method: 'PATCH',
        body: payload
      })
    }),
    deleteJobReview: builder.mutation<{ message: string }, number>({
      query: (jobId) => ({
        url: `/jobs/${jobId}/review`,
        method: 'DELETE'
      })
    }),
    getNearbyJobs: builder.query<
      NearbyJobRead[],
      { latitude: number; longitude: number; radius_km?: number; limit?: number; status?: string }
    >({
      query: ({ latitude, longitude, radius_km, limit, status }) => ({
        url: '/jobs/nearby',
        params: { latitude, longitude, radius_km, limit, status }
      })
    })
  })
});

export const {
  useCreateJobMutation,
  useGetMyJobsQuery,
  useGetJobQuery,
  useAssignJobMutation,
  useUpdateJobStatusMutation,
  useAcceptJobMutation,
  useCompleteJobMutation,
  useGetJobReviewQuery,
  useCreateJobReviewMutation,
  useUpdateJobReviewMutation,
  useDeleteJobReviewMutation,
  useGetNearbyJobsQuery
} = jobsApi;
