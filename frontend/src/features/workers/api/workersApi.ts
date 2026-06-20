import {apiSlice} from '../../../app/apiSlice';
import type {WorkerNearbyRead, WorkerRatingSummary, WorkerReview, WorkersResponse} from '../types';

export interface WorkerFilters {
    page?: number;
    items_per_page?: number;
    category?: number;
    profession?: string;
    lat?: number;
    long?: number;
    radius_km?: number;
    verified_only?: boolean;
    min_rating?: number;
}

export const workersApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getWorkers: builder.query<WorkersResponse, WorkerFilters>({
            query: (filters) => ({
                url: '/workers',
                params: filters
            })
        }),
        getWorkerReviews: builder.query<WorkerReview[], number>({
            query: (workerUserId) => ({
                url: `/workers/${workerUserId}/reviews`
            })
        }),
        getWorkerRating: builder.query<WorkerRatingSummary, number>({
            query: (workerUserId) => ({
                url: `/workers/${workerUserId}/rating`
            })
        }),
        getNearbyWorkers: builder.query<WorkerNearbyRead[], {
            latitude: number;
            longitude: number;
            radius_km?: number
        }>({
            query: ({latitude, longitude, radius_km}) => ({
                url: '/workers/nearby',
                params: {latitude, longitude, radius_km}
            })
        })
    })
});

export const {
    useGetWorkersQuery,
    useGetWorkerReviewsQuery,
    useGetWorkerRatingQuery,
    useGetNearbyWorkersQuery
} = workersApi;
