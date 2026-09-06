import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {jobApi} from '@/lib';
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx';
import {useUpdateJobApplication} from '@/features/job/hooks/useUpdateJobApplication';
import {ApplicationStatus, JobApplicationRead} from '@/features/job';
import {PaginatedListResponse} from '@/features/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib', () => ({
    jobApi: {
        updateJobApplication: vi.fn(),
    },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockApplication = (id: number, status: ApplicationStatus = 'pending'): JobApplicationRead => ({
    id,
    status,
    message: null,
    job: null,
    worker_profile: null,
});

const makePage = (apps: JobApplicationRead[]): PaginatedListResponse<JobApplicationRead> => ({
    data: apps,
    total_count: apps.length,
    has_more: false,
    page: 1,
    items_per_page: 50,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useUpdateJobApplication', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    // ─── Mutation execution ────────────────────────────────────────────────────

    describe('mutation execution', () => {
        it('calls jobApi.updateJobApplication with the correct parameters', async () => {
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(1, 'accepted'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(jobApi.updateJobApplication).toHaveBeenCalledWith(1, 1, {status: 'accepted'});
        });

        it('calls the API exactly once per mutate call', async () => {
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(2, 'rejected'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 2, payload: {status: 'rejected'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(jobApi.updateJobApplication).toHaveBeenCalledTimes(1);
        });
    });

    // ─── Loading state ─────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is pending while the mutation is in flight', async () => {
            vi.mocked(jobApi.updateJobApplication).mockImplementation(() => new Promise(() => {}));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isPending).toBe(true));
        });

        it('is not pending after success', async () => {
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(1, 'accepted'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isPending).toBe(false));
            expect(result.current.isSuccess).toBe(true);
        });

        it('is not pending after failure', async () => {
            vi.mocked(jobApi.updateJobApplication).mockRejectedValue(new Error('Server error'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isPending).toBe(false));
            expect(result.current.isError).toBe(true);
        });
    });

    // ─── Success state ─────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns the updated application', async () => {
            const updated = mockApplication(3, 'accepted');
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(updated);
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 3, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(updated);
        });

        // ── Regression: cache must update immediately (optimistic), not one action behind ──

        it('optimistically updates the cache before the network request resolves', async () => {
            queryClient.setQueryData(['job-applications', 1], makePage([mockApplication(3, 'pending')]));

            let resolveRequest!: (value: JobApplicationRead) => void;
            vi.mocked(jobApi.updateJobApplication).mockImplementation(
                () => new Promise<JobApplicationRead>(resolve => { resolveRequest = resolve; })
            );

            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 3, payload: {status: 'accepted'}});

            // Cache must reflect 'accepted' while the request is still in flight.
            await waitFor(() => {
                const cached = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(['job-applications', 1]);
                expect(cached?.data.find(a => a.id === 3)?.status).toBe('accepted');
            });
            expect(result.current.isSuccess).toBe(false);

            resolveRequest(mockApplication(3, 'accepted'));
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
        });

        it('replaces the optimistic entry with the authoritative server response on success', async () => {
            queryClient.setQueryData(['job-applications', 1], makePage([mockApplication(3, 'pending')]));

            const accepted = mockApplication(3, 'accepted');
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(accepted);
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 3, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            const cached = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(['job-applications', 1]);
            expect(cached?.data.find(a => a.id === 3)?.status).toBe('accepted');
        });

        it('immediately reflects a reject in the cache', async () => {
            queryClient.setQueryData(['job-applications', 2], makePage([mockApplication(5, 'pending')]));

            const rejected = mockApplication(5, 'rejected');
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(rejected);
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 2, appId: 5, payload: {status: 'rejected'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            const cached = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(['job-applications', 2]);
            expect(cached?.data.find(a => a.id === 5)?.status).toBe('rejected');
        });

        it('leaves other applications in the cache untouched', async () => {
            queryClient.setQueryData(
                ['job-applications', 1],
                makePage([mockApplication(1, 'pending'), mockApplication(2, 'pending')])
            );

            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(1, 'accepted'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            const cached = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(['job-applications', 1]);
            expect(cached?.data.find(a => a.id === 2)?.status).toBe('pending');
        });

        it('does NOT invalidate the job-applications query (avoids stale GET overwriting correct cache)', async () => {
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(1, 'accepted'));
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 5, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(invalidateSpy).not.toHaveBeenCalledWith({queryKey: ['job-applications', 5]});
        });

        it('invalidates the jobs list query', async () => {
            vi.mocked(jobApi.updateJobApplication).mockResolvedValue(mockApplication(1, 'rejected'));
            const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 5, appId: 1, payload: {status: 'rejected'}});

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['jobs']});
        });
    });

    // ─── Error state ───────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when the API call fails', async () => {
            vi.mocked(jobApi.updateJobApplication).mockRejectedValue(new Error('Forbidden'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isError).toBe(true));
        });

        it('exposes the error object on failure', async () => {
            vi.mocked(jobApi.updateJobApplication).mockRejectedValue(new Error('Unauthorized'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'rejected'}});

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toBeTruthy();
        });

        it('rolls back the cache to its previous state when the mutation fails', async () => {
            queryClient.setQueryData(['job-applications', 1], makePage([mockApplication(1, 'pending')]));
            vi.mocked(jobApi.updateJobApplication).mockRejectedValue(new Error('Server error'));
            const {result} = renderHook(() => useUpdateJobApplication(), {wrapper: createWrapper(queryClient)});

            result.current.mutate({jobId: 1, appId: 1, payload: {status: 'accepted'}});

            await waitFor(() => expect(result.current.isError).toBe(true));

            // Optimistic update was applied then rolled back — final state must match original.
            const cached = queryClient.getQueryData<PaginatedListResponse<JobApplicationRead>>(['job-applications', 1]);
            expect(cached?.data[0].status).toBe('pending');
        });
    });
});