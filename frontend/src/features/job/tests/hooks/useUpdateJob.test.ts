import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {useUpdateJob} from '@/features/job/hooks/useUpdateJob.ts';
import {jobApi} from '@/lib';
import {JobRead, JobStatus} from '@/features/job';
import {toast} from 'sonner';
import {createQueryClient, createWrapper} from "@/features/worker/tests/helpers.tsx";

// Mock dependencies
vi.mock('@/lib', () => ({
    jobApi: {
        updateJob: vi.fn(),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));


const mockJob: JobRead = {
    id: 1,
    uuid: 'test-uuid',
    title: 'Updated Job',
    user_id: 42,
    status: 'open' as JobStatus,
    created_at: '2024-01-01T00:00:00Z',
    is_deleted: false,
    coordinates: null,
    description: 'Updated description',
    trade_category_id: 1,
    budget_min: '100.00',
    budget_max: '500.00',
    display_location: 'New York, NY',
    updated_at: '2024-01-02T00:00:00Z',
    deleted_at: null,
    customer_marked_complete_at: null,
    worker_marked_complete_at: null,
    trade_category: null,
    user: null,
};

describe('useUpdateJob', () => {
    let queryClient: QueryClient;
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient()
    });

    it('calls jobApi.updateJob with correct parameters', async () => {
        vi.mocked(jobApi.updateJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(jobApi.updateJob).toHaveBeenCalledWith(1, {title: 'Updated Job'});
    });

    it('updates job cache on success', async () => {
        vi.mocked(jobApi.updateJob).mockResolvedValue(mockJob);

        // Pre-populate cache
        queryClient.setQueryData(['job', 1], {...mockJob, title: 'Old Title'});

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        const cachedJob = queryClient.getQueryData<JobRead>(['job', 1]);
        expect(cachedJob?.title).toBe('Updated Job');
    });

    it('shows success toast on success', async () => {
        vi.mocked(jobApi.updateJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalledWith('Job updated successfully');
    });

    it('shows error toast on failure', async () => {
        const error = new Error('Update failed') as Error & { response?: { data?: { detail: string } } };
        error.response = {data: {detail: 'Job not found'}};
        vi.mocked(jobApi.updateJob).mockRejectedValue(error);

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Job not found');
    });

    it('shows generic error toast when no detail message', async () => {
        vi.mocked(jobApi.updateJob).mockRejectedValue(new Error('Network error'));

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Failed to update job');
    });

    it('invalidates job and jobs queries on success', async () => {
        vi.mocked(jobApi.updateJob).mockResolvedValue(mockJob);

        const queryClient = new QueryClient({
            defaultOptions: {
                queries: {retry: false},
                mutations: {retry: false},
            },
        });
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const {result} = renderHook(() => useUpdateJob(), {wrapper: createWrapper(queryClient)});

        result.current.mutate({id: 1, payload: {title: 'Updated Job'}});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['jobs']});
    });
});