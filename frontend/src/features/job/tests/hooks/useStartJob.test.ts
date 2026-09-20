import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {useStartJob} from '@/features/job/hooks/useStartJob';
import {jobApi} from '@/lib';
import {JobRead, JobStatus} from '@/features/job';
import {toast} from 'sonner';
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx';

vi.mock('@/lib', () => ({
    jobApi: {
        startJob: vi.fn(),
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
    title: 'Fix Leaky Faucet',
    user_id: 42,
    status: 'in_progress' as JobStatus,
    created_at: '2024-01-01T00:00:00Z',
    is_deleted: false,
    coordinates: null,
    description: 'desc',
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

describe('useStartJob', () => {
    let queryClient: QueryClient;
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    it('calls jobApi.startJob with the job id', async () => {
        vi.mocked(jobApi.startJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useStartJob(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(jobApi.startJob).toHaveBeenCalledWith(1);
    });

    it('shows success toast on success', async () => {
        vi.mocked(jobApi.startJob).mockResolvedValue(mockJob);

        const {result} = renderHook(() => useStartJob(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalledWith('Job started!');
    });

    it('shows error toast on failure', async () => {
        const error = new Error('Start failed') as Error & { response?: { data?: { detail: string } } };
        error.response = {data: {detail: 'Job cannot be started'}};
        vi.mocked(jobApi.startJob).mockRejectedValue(error);

        const {result} = renderHook(() => useStartJob(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate();

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Job cannot be started');
    });

    it('invalidates both the job detail and jobs list queries on success, so job cards refresh without a hard reload', async () => {
        vi.mocked(jobApi.startJob).mockResolvedValue(mockJob);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const {result} = renderHook(() => useStartJob(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate();

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['job', 1]});
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['jobs']});
    });
});
