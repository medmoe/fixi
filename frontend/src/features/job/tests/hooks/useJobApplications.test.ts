import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {jobApi} from '@/lib';
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx';
import {useJobApplications} from '@/features/job/hooks/useJobApplications';
import {ApplicationStatus, JobApplicationRead} from '@/features/job';
import {PaginatedListResponse} from '@/features/types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib', () => ({
    jobApi: {
        getJobApplications: vi.fn(),
    },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockApplication = (id: number, status: ApplicationStatus = 'pending'): JobApplicationRead => ({
    id,
    status,
    message: null,
    job: null,
    worker_profile: null,
    accepted_at: null,
    worker_confirmed_at: null,
    decline_reason: null,
});

const makePage = (apps: JobApplicationRead[]): PaginatedListResponse<JobApplicationRead> => ({
    data: apps,
    total_count: apps.length,
    has_more: false,
    page: 1,
    items_per_page: 50,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useJobApplications', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    // ─── Query execution ───────────────────────────────────────────────────────

    describe('query execution', () => {
        it('calls jobApi.getJobApplications with the given jobId', async () => {
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(makePage([]));
            renderHook(() => useJobApplications(42), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(jobApi.getJobApplications).toHaveBeenCalledWith(42));
        });

        it('stores the result under the correct query key', async () => {
            const page = makePage([mockApplication(1)]);
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(page);
            renderHook(() => useJobApplications(42), {wrapper: createWrapper(queryClient)});
            await waitFor(() =>
                expect(queryClient.getQueryData(['job-applications', 42])).toEqual(page)
            );
        });

        it('does not fetch when jobId is null', () => {
            renderHook(() => useJobApplications(null), {wrapper: createWrapper(queryClient)});
            expect(jobApi.getJobApplications).not.toHaveBeenCalled();
        });

        it('fetches once per jobId on mount', async () => {
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(makePage([]));
            renderHook(() => useJobApplications(7), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(jobApi.getJobApplications).toHaveBeenCalledTimes(1));
        });
    });

    // ─── Loading state ─────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('is loading initially when jobId is provided', () => {
            vi.mocked(jobApi.getJobApplications).mockImplementation(() => new Promise(() => {}));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            expect(result.current.isLoading).toBe(true);
        });

        it('is not loading after a successful fetch', async () => {
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(makePage([]));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isLoading).toBe(false));
            expect(result.current.isSuccess).toBe(true);
        });

        it('is not loading when disabled (null jobId)', () => {
            const {result} = renderHook(() => useJobApplications(null), {wrapper: createWrapper(queryClient)});
            expect(result.current.isLoading).toBe(false);
        });
    });

    // ─── Success state ─────────────────────────────────────────────────────────

    describe('success state', () => {
        it('returns the full paginated response', async () => {
            const page = makePage([mockApplication(1), mockApplication(2)]);
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(page);
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(page);
        });

        it('returns applications preserving their statuses', async () => {
            const apps = [
                mockApplication(1, 'pending'),
                mockApplication(2, 'accepted'),
                mockApplication(3, 'rejected'),
            ];
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(makePage(apps));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data?.data.map(a => a.status)).toEqual(['pending', 'accepted', 'rejected']);
        });

        it('returns an empty list when no applications exist', async () => {
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(makePage([]));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data?.data).toHaveLength(0);
        });

        it('serves cached data on remount without refetching', async () => {
            const page = makePage([mockApplication(1)]);
            vi.mocked(jobApi.getJobApplications).mockResolvedValue(page);

            const {unmount} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(queryClient.getQueryData(['job-applications', 1])).toBeDefined());
            unmount();

            renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(jobApi.getJobApplications).toHaveBeenCalledTimes(1));
        });
    });

    // ─── Error state ───────────────────────────────────────────────────────────

    describe('error state', () => {
        it('is error when the API call fails', async () => {
            vi.mocked(jobApi.getJobApplications).mockRejectedValue(new Error('Network error'));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isError).toBe(true));
        });

        it('exposes the error object', async () => {
            vi.mocked(jobApi.getJobApplications).mockRejectedValue(new Error('Forbidden'));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toBeTruthy();
        });

        it('returns no data on failure', async () => {
            vi.mocked(jobApi.getJobApplications).mockRejectedValue(new Error('Not found'));
            const {result} = renderHook(() => useJobApplications(1), {wrapper: createWrapper(queryClient)});
            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.data).toBeUndefined();
        });
    });
});
