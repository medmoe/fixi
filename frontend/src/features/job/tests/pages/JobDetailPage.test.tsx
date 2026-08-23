import {describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {JobDetailPage} from '@/features/job/pages/JobDetailPage.tsx';
import {jobApi} from '@/lib';
import {mockJob} from "@/mocks";

vi.mock('@/lib', () => ({
    jobApi: {
        getJob: vi.fn(),
    },
}));

const createWrapper = (initialEntries: string[]) => {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    return ({}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={initialEntries} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
                <Routes>
                    <Route path="/jobs/:id" element={<JobDetailPage/>}/>
                    <Route path="/jobs" element={<div>Jobs List</div>}/>
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
};
describe('JobDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', () => {
        vi.mocked(jobApi.getJob).mockImplementation(() => new Promise(() => {
        }));

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });
        expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('renders job details on success', async () => {
        vi.mocked(jobApi.getJob).mockResolvedValue(mockJob);

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });

        await waitFor(() => {
            expect(screen.getByText('Fix Leaking Kitchen Sink')).toBeInTheDocument();
        });

        expect(screen.getByText('open')).toBeInTheDocument();
        expect(screen.getByText('plumbing')).toBeInTheDocument();
        expect(screen.getByText('New York, NY')).toBeInTheDocument();
        expect(screen.getByText('$75.00 - $200.00')).toBeInTheDocument();
        expect(screen.getByText(/Kitchen sink has been leaking under the cabinet for two days. Need urgent repair./)).toBeInTheDocument();
    });

    it('renders error state when job not found', async () => {
        vi.mocked(jobApi.getJob).mockRejectedValue(new Error('Job not found'));

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/999']),
        });

        await waitFor(() => {
            expect(screen.getByText('Job not found')).toBeInTheDocument();
        });
    });

    it('navigates back to jobs list', async () => {
        vi.mocked(jobApi.getJob).mockResolvedValue(mockJob);

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });

        await waitFor(() => {
            expect(screen.getByText('Fix Leaking Kitchen Sink')).toBeInTheDocument();
        });

        const backButton = screen.getByRole('button', {name: /back/i});
        expect(backButton).toBeInTheDocument();
    });

    it('does not fetch when id is not a number', () => {
        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/invalid']),
        });

        expect(jobApi.getJob).not.toHaveBeenCalled();
    });

    it('renders without description when job has no description', async () => {
        const jobWithoutDesc = {...mockJob, description: null};
        vi.mocked(jobApi.getJob).mockResolvedValue(jobWithoutDesc);

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });

        await waitFor(() => {
            expect(screen.getByText('Fix Leaking Kitchen Sink')).toBeInTheDocument();
        });

        expect(screen.queryByText('Description')).not.toBeInTheDocument();
    });

    it('renders without location when job has no location', async () => {
        const jobWithoutLocation = {...mockJob, display_location: null};
        vi.mocked(jobApi.getJob).mockResolvedValue(jobWithoutLocation);

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });

        await waitFor(() => {
            expect(screen.getByText('Fix Leaking Kitchen Sink')).toBeInTheDocument();
        });

        expect(screen.queryByText('New York, NY')).not.toBeInTheDocument();
    });

    it('renders without budget when job has no budget', async () => {
        const jobWithoutBudget = {...mockJob, budget_min: null, budget_max: null};
        vi.mocked(jobApi.getJob).mockResolvedValue(jobWithoutBudget);

        render(<JobDetailPage/>, {
            wrapper: createWrapper(['/jobs/1']),
        });

        await waitFor(() => {
            expect(screen.getByText('Fix Leaking Kitchen Sink')).toBeInTheDocument();
        });

        expect(screen.queryByText('$50.00')).not.toBeInTheDocument();
    });
});