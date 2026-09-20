import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {useConfirmApplication} from '@/features/job/hooks/useConfirmApplication';
import {jobApi} from '@/lib';
import {JobApplicationRead} from '@/features/job';
import {toast} from 'sonner';
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx';

vi.mock('@/lib', () => ({
    jobApi: {
        confirmApplication: vi.fn(),
    },
}));

vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

const mockApplication: JobApplicationRead = {
    id: 10,
    message: null,
    status: 'accepted',
    accepted_at: '2024-01-01T00:00:00Z',
    worker_confirmed_at: '2024-01-02T00:00:00Z',
    decline_reason: null,
    job: null,
    worker_profile: null,
};

describe('useConfirmApplication', () => {
    let queryClient: QueryClient;
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    it('calls jobApi.confirmApplication with job and application ids', async () => {
        vi.mocked(jobApi.confirmApplication).mockResolvedValue(mockApplication);

        const {result} = renderHook(() => useConfirmApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate(10);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(jobApi.confirmApplication).toHaveBeenCalledWith(1, 10);
    });

    it('shows success toast on success', async () => {
        vi.mocked(jobApi.confirmApplication).mockResolvedValue(mockApplication);

        const {result} = renderHook(() => useConfirmApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate(10);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalledWith('Assignment confirmed!');
    });

    it('shows error toast on failure', async () => {
        const error = new Error('Confirm failed') as Error & { response?: { data?: { detail: string } } };
        error.response = {data: {detail: 'Application cannot be confirmed'}};
        vi.mocked(jobApi.confirmApplication).mockRejectedValue(error);

        const {result} = renderHook(() => useConfirmApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate(10);

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Application cannot be confirmed');
    });

    it('invalidates the application, job detail, and jobs list queries on success, so job cards refresh without a hard reload', async () => {
        vi.mocked(jobApi.confirmApplication).mockResolvedValue(mockApplication);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const {result} = renderHook(() => useConfirmApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate(10);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['my-job-application', 1]});
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['job', 1]});
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['jobs']});
    });
});
