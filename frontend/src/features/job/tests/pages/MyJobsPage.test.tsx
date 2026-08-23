import {describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {MyJobsPage} from '@/features/job/pages/MyJobsPage.tsx';
import {jobApi} from '@/lib';
import {JobRead, JobStatus} from '@/features/job';
import {useUser} from '@/features/user';

import {mockUseUser} from '@/mocks';
import {useDeleteJob} from '@/features/job/hooks/useDeleteJob';

vi.mock('@/lib', () => ({
    jobApi: {
        getMyJobs: vi.fn(),
        deleteJob: vi.fn(),
    },
}));

vi.mock('@/features/user', () => ({
    useUser: vi.fn(),
}));

vi.mock('@/features/job/hooks/useDeleteJob')
const mockDeleteJob = vi.fn();

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}},
    });
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/jobs']} future={{v7_startTransition: true, v7_relativeSplatPath: true}}>
                <Routes>
                    <Route path="/jobs" element={children}/>
                    <Route path="/jobs/create" element={<div>Create Job</div>}/>
                    <Route path="/jobs/:id" element={<div>Job Detail</div>}/>
                    <Route path="/jobs/:id/edit" element={<div>Edit Job</div>}/>
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>
    );
};

const mockUser = {id: 42, email: 'test@example.com', name: 'Test User'};

const createMockJob = (overrides: Partial<JobRead> = {}): JobRead => ({
    id: 1,
    uuid: 'uuid-1',
    title: 'Fix Leaky Faucet',
    user_id: 42,
    status: 'open' as JobStatus,
    created_at: '2024-01-15T10:00:00Z',
    is_deleted: false,
    coordinates: null,
    description: 'Kitchen faucet needs repair',
    trade_category_id: 1,
    budget_min: '50.00',
    budget_max: '150.00',
    display_location: 'Brooklyn, NY',
    updated_at: null,
    deleted_at: null,
    trade_category: null,
    user: null,
    ...overrides,
});

describe('MyJobsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useDeleteJob).mockReturnValue({
            mutate: mockDeleteJob,
            isPending: false,
        } as unknown as ReturnType<typeof useDeleteJob>);
    });

    it('renders user loading state initially', () => {
        vi.mocked(useUser).mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        } as ReturnType<typeof useUser>);

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('renders sign-in prompt when user is not authenticated', () => {
        vi.mocked(useUser).mockReturnValue(mockUseUser({
            data: null,
            isLoading: false,
            error: null,
        }));

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        expect(screen.getByText(/please sign in to view your jobs/i)).toBeInTheDocument();
    });

    it('renders sign-in prompt when user fetch errors', () => {
        vi.mocked(useUser).mockReturnValue(mockUseUser({
            data: null,
            isLoading: false,
            error: new Error('Unauthorized'),
        }));

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        expect(screen.getByText(/please sign in to view your jobs/i)).toBeInTheDocument();
    });

    it('renders jobs loading state when user is loaded', () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        vi.mocked(jobApi.getMyJobs).mockImplementation(() => new Promise(() => {
        }));

        render(<MyJobsPage/>, {wrapper: createWrapper()});
        expect(document.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    });

    it('renders empty state when no jobs', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [],
            total_count: 0,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText(/haven't posted any jobs/)).toBeInTheDocument();
        });

        expect(screen.getByRole('button', {name: /post your first job/i})).toBeInTheDocument();
    });

    it('renders list of jobs', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        const jobs = [
            createMockJob({id: 1, title: 'Job One'}),
            createMockJob({id: 2, title: 'Job Two', status: 'in_progress' as JobStatus}),
        ];
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: jobs,
            total_count: 2,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText('Job One')).toBeInTheDocument();
        });

        expect(screen.getByText('Job Two')).toBeInTheDocument();
        expect(screen.getByText('open')).toBeInTheDocument();
        expect(screen.getByText('in progress')).toBeInTheDocument();
    });

    it('navigates to create job page from empty state', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [],
            total_count: 0,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText(/haven't posted any jobs/)).toBeInTheDocument();
        });

        const createButton = screen.getByRole('button', {name: /post your first job/i});
        await act(async () => await userEvent.click(createButton));

        expect(screen.getByText('Create Job')).toBeInTheDocument();
    });

    it('navigates to create job page from header button', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [createMockJob()],
            total_count: 1,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText('Fix Leaky Faucet')).toBeInTheDocument();
        });

        const postNewButton = screen.getByRole('button', {name: /post new job/i});
        await act(async () => await userEvent.click(postNewButton));

        expect(screen.getByText('Create Job')).toBeInTheDocument();
    });

    it('shows edit button only for open jobs', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        const jobs = [
            createMockJob({id: 1, title: 'Open Job', status: 'open' as JobStatus}),
            createMockJob({id: 2, title: 'In Progress Job', status: 'in_progress' as JobStatus}),
        ];
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: jobs,
            total_count: 2,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText('Open Job')).toBeInTheDocument();
        });

        const editButtons = screen.getAllByRole('button', {name: /edit job/i});
        expect(editButtons).toHaveLength(1);
    });

    it('navigates to job detail on view click', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        const job = createMockJob({id: 1, title: 'Viewable Job'});
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [job],
            total_count: 1,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText('Viewable Job')).toBeInTheDocument();
        });

        const viewButton = screen.getByRole('button', {name: /view job/i});
        await act(async () => await userEvent.click(viewButton));

        expect(screen.getByText('Job Detail')).toBeInTheDocument();
    });

    it('calls deleteJob when deletion is confirmed', async () => {
        const user = userEvent.setup();

        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);

        const deleteJob = vi.fn();

        vi.mocked(useDeleteJob).mockReturnValue({
            mutate: deleteJob,
            isPending: false,
        } as unknown as ReturnType<typeof useDeleteJob>);

        const job = createMockJob({
            id: 1,
            title: 'Deletable Job',
        });

        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [job],
            total_count: 1,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {
            wrapper: createWrapper(),
        });

        // Wait for the job to appear
        expect(await screen.findByText('Deletable Job')).toBeInTheDocument();

        // Open confirmation dialog
        await act(async () => await user.click(
            screen.getByRole('button', {
                name: 'Delete job Deletable Job',
            })
        ))

        // Verify confirmation dialog appeared
        expect(
            screen.getByRole('heading', {name: 'Delete this job?'})
        ).toBeInTheDocument();

        expect(
            screen.getByText(/permanently remove.*Deletable Job/i)
        ).toBeInTheDocument();

        // Confirm deletion
        await act(async () => await user.click(
            screen.getByRole('button', {name: 'Delete'})
        ))

        expect(deleteJob).toHaveBeenCalledWith(
            1,
            expect.objectContaining({
                onSuccess: expect.any(Function),
            })
        );
    })

    it('does not call deleteJob when cancelled', async () => {
        vi.stubGlobal('confirm', vi.fn(() => false));
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        const job = createMockJob({id: 1, title: 'Safe Job'});
        vi.mocked(jobApi.getMyJobs).mockResolvedValue({
            data: [job],
            total_count: 1,
            has_more: false,
            page: 1,
            items_per_page: 20,
        });

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText('Safe Job')).toBeInTheDocument();
        });

        const deleteButton = screen.getByRole('button', {name: /delete job/i});
        await act(async () => await userEvent.click(deleteButton));

        expect(jobApi.deleteJob).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
    });

    it('renders error state on fetch failure', async () => {
        vi.mocked(useUser).mockReturnValue({
            data: mockUser,
            isLoading: false,
            error: null,
        } as ReturnType<typeof useUser>);
        vi.mocked(jobApi.getMyJobs).mockRejectedValue(new Error('Network error'));

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        await waitFor(() => {
            expect(screen.getByText(/failed to load jobs/i)).toBeInTheDocument();
        });
    });

    it('does not fetch jobs when user is loading', () => {
        vi.mocked(useUser).mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        } as ReturnType<typeof useUser>);

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        expect(jobApi.getMyJobs).not.toHaveBeenCalled();
    });

    it('does not fetch jobs when user is null', () => {
        vi.mocked(useUser).mockReturnValue(mockUseUser({
            data: null,
            isLoading: false,
            error: null,
        }));

        render(<MyJobsPage/>, {wrapper: createWrapper()});

        expect(jobApi.getMyJobs).not.toHaveBeenCalled();
    });
});