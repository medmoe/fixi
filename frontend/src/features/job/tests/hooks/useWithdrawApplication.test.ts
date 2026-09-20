import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {QueryClient} from '@tanstack/react-query';
import {useWithdrawApplication} from '@/features/job/hooks/useWithdrawApplication';
import {jobApi} from '@/lib';
import {JobApplicationRead} from '@/features/job';
import {toast} from 'sonner';
import {createQueryClient, createWrapper} from '@/features/worker/tests/helpers.tsx';

vi.mock('@/lib', () => ({
    jobApi: {
        withdrawApplication: vi.fn(),
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
    status: 'rejected',
    accepted_at: null,
    worker_confirmed_at: null,
    decline_reason: 'worker_unavailable',
    job: null,
    worker_profile: null,
};

describe('useWithdrawApplication', () => {
    let queryClient: QueryClient;
    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = createQueryClient();
    });

    it('calls jobApi.withdrawApplication with job, application ids and decline reason', async () => {
        vi.mocked(jobApi.withdrawApplication).mockResolvedValue(mockApplication);

        const {result} = renderHook(() => useWithdrawApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate({appId: 10, declineReason: 'worker_unavailable'});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(jobApi.withdrawApplication).toHaveBeenCalledWith(1, 10, {decline_reason: 'worker_unavailable'});
    });

    it('shows success toast on success', async () => {
        vi.mocked(jobApi.withdrawApplication).mockResolvedValue(mockApplication);

        const {result} = renderHook(() => useWithdrawApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate({appId: 10, declineReason: 'worker_unavailable'});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(toast.success).toHaveBeenCalledWith('Application withdrawn');
    });

    it('shows error toast on failure', async () => {
        const error = new Error('Withdraw failed') as Error & { response?: { data?: { detail: string } } };
        error.response = {data: {detail: 'Application cannot be withdrawn'}};
        vi.mocked(jobApi.withdrawApplication).mockRejectedValue(error);

        const {result} = renderHook(() => useWithdrawApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate({appId: 10, declineReason: 'worker_unavailable'});

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(toast.error).toHaveBeenCalledWith('Application cannot be withdrawn');
    });

    it('invalidates the application, job detail, and jobs list queries on success, so job cards refresh without a hard reload', async () => {
        vi.mocked(jobApi.withdrawApplication).mockResolvedValue(mockApplication);

        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

        const {result} = renderHook(() => useWithdrawApplication(1), {wrapper: createWrapper(queryClient)});
        result.current.mutate({appId: 10, declineReason: 'worker_unavailable'});

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['my-job-application', 1]});
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['job', 1]});
        expect(invalidateSpy).toHaveBeenCalledWith({queryKey: ['jobs']});
    });
});
