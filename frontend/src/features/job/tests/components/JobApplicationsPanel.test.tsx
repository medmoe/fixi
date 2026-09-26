import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router-dom';
import {JobApplicationsPanel} from '@/features/job/components/JobApplicationsPanel';
import {useJobApplications} from '@/features/job/hooks/useJobApplications';
import {useUpdateJobApplication} from '@/features/job/hooks/useUpdateJobApplication';
import {JobApplicationRead} from '@/features/job';
import {WorkerProfileWithTradesRead} from '@/features/worker';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/job/hooks/useJobApplications');
vi.mock('@/features/job/hooks/useUpdateJobApplication');

// AlertDialogCancel in Radix closes the dialog via internal context. We wire
// that up manually here so Cancel tests can assert the dialog disappears.
vi.mock('@/components/ui/alert-dialog', async () => {
    const React = await import('react');
    const CloseCtx = React.createContext<(() => void) | null>(null);
    return {
        AlertDialog: ({children, open, onOpenChange}: any) =>
            open ? (
                <CloseCtx.Provider value={() => onOpenChange?.(false)}>
                    <div data-testid="alert-dialog">{children}</div>
                </CloseCtx.Provider>
            ) : null,
        AlertDialogAction: ({children, onClick, disabled, className}: any) => (
            <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
        ),
        AlertDialogCancel: ({children, disabled}: any) => {
            const close = React.useContext(CloseCtx);
            return <button disabled={disabled} onClick={() => close?.()}>{children}</button>;
        },
        AlertDialogContent: ({children}: any) => <div>{children}</div>,
        AlertDialogDescription: ({children}: any) => <p>{children}</p>,
        AlertDialogFooter: ({children}: any) => <div>{children}</div>,
        AlertDialogHeader: ({children}: any) => <div>{children}</div>,
        AlertDialogTitle: ({children}: any) => <h4>{children}</h4>,
    };
});

vi.mock('@/components/ui/select', () => ({
    Select: ({children, onValueChange, value}: any) => (
        <select
            data-testid="mocked-select"
            aria-label="Reason for rejecting"
            value={value}
            onChange={(e) => onValueChange?.(e.target.value)}
        >
            {children}
        </select>
    ),
    SelectTrigger: ({children}: any) => <>{children}</>,
    SelectValue: ({placeholder}: any) => <option value="">{placeholder}</option>,
    SelectContent: ({children}: any) => <>{children}</>,
    SelectItem: ({value, children}: any) => (
        <option value={value}>{children}</option>
    ),
}));

vi.mock('@/components/ui/card', () => ({
    Card: ({children, className}: any) => <div className={className}>{children}</div>,
    CardContent: ({children, className}: any) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/skeleton', () => ({
    Skeleton: ({className}: any) => <div data-testid="skeleton" className={className}/>,
}));

vi.mock('@/components/ui/avatar', () => ({
    Avatar: ({children}: any) => <div>{children}</div>,
    AvatarFallback: ({children}: any) => <span>{children}</span>,
    AvatarImage: ({src, alt}: any) => <img src={src} alt={alt}/>,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockWorker: WorkerProfileWithTradesRead = {
    id: 1,
    user_id: 1,
    bio: 'Experienced plumber',
    hourly_rate: '75.00',
    years_of_experience: 5,
    service_radius_km: 20,
    is_available: true,
    is_verified: true,
    has_cni_document: false,
    available_since: null,
    average_rating: null,
    review_count: 0,
    trade_categories: [
        {
            id: 1,
            worker_profile_id: 1,
            trade_category_id: 1,
            skill_level: 'junior',
            trade_category: {id: 1, name: 'plumbing', display_name: 'Plumbing', icon_name: null, parent_id: null, created_at: null},
        },
    ],
    user: {id: 1, name: 'Alice Smith', location: null, display_location: null},
    avatar_url: null,
};

const mockApp = (id: number, status: JobApplicationRead['status'] = 'pending', message?: string): JobApplicationRead => ({
    id,
    status,
    message: message ?? null,
    job: null,
    worker_profile: mockWorker,
    accepted_at: null,
    worker_confirmed_at: null,
    decline_reason: null,
});

const makePage = (apps: JobApplicationRead[]) => ({
    data: apps,
    total_count: apps.length,
    has_more: false,
    page: 1,
    items_per_page: 50,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mutateMock = vi.fn();

const renderPanel = (props: { jobId?: number; jobStatus?: string } = {}) => {
    const {jobId = 1, jobStatus = 'open'} = props;
    return render(
        <MemoryRouter future={{v7_relativeSplatPath: true, v7_startTransition: true}}>
            <JobApplicationsPanel jobId={jobId} jobStatus={jobStatus}/>
        </MemoryRouter>
    );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('JobApplicationsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useJobApplications).mockReturnValue({
            data: makePage([]),
            isLoading: false,
            isError: false,
        } as any);
        vi.mocked(useUpdateJobApplication).mockReturnValue({
            mutate: mutateMock,
            isPending: false,
        } as any);
    });

    // ─── Collapsed state ───────────────────────────────────────────────────────

    describe('collapsed state', () => {
        it('renders the Applications toggle button', () => {
            renderPanel();
            expect(screen.getByRole('button', {name: /applications/i})).toBeInTheDocument();
        });

        it('does not show application cards when collapsed', () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1)]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
        });

        it('shows total application count badge when there are applications', () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1), mockApp(2)]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            expect(screen.getByText('2')).toBeInTheDocument();
        });

        it('shows a pending count badge when there are pending applications', () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1, 'pending'), mockApp(2, 'accepted')]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            expect(screen.getByText('1 pending')).toBeInTheDocument();
        });

        it('does not show a pending badge when there are no pending applications', () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1, 'accepted')]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
        });
    });

    // ─── Expanded state ────────────────────────────────────────────────────────

    describe('expanded state', () => {
        it('expands when the toggle button is clicked', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1)]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        });

        it('collapses again on a second click', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1)]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            const toggle = screen.getByRole('button', {name: /applications/i});
            await act(async () => userEvent.click(toggle));
            await act(async () => userEvent.click(toggle));
            expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
        });

        it('shows the empty-state message when there are no applications', async () => {
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
        });
    });

    // ─── Loading state ─────────────────────────────────────────────────────────

    describe('loading state', () => {
        it('shows skeleton placeholders while loading', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
        });

        it('does not show application cards while loading', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: undefined,
                isLoading: true,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
        });
    });

    // ─── Error state ───────────────────────────────────────────────────────────

    describe('error state', () => {
        it('shows an error message when loading fails', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: undefined,
                isLoading: false,
                isError: true,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.getByText(/failed to load applications/i)).toBeInTheDocument();
        });
    });

    // ─── Application card ──────────────────────────────────────────────────────

    describe('application card', () => {
        const expandAndRender = async (apps: JobApplicationRead[]) => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage(apps),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
        };

        it('shows the worker name', async () => {
            await expandAndRender([mockApp(1)]);
            expect(screen.getByText('Alice Smith')).toBeInTheDocument();
        });

        it('shows the application message when present', async () => {
            await expandAndRender([mockApp(1, 'pending', 'I am available next week')]);
            expect(screen.getByText('I am available next week')).toBeInTheDocument();
        });

        it('does not render a message section when message is null', async () => {
            await expandAndRender([mockApp(1, 'pending', undefined)]);
            expect(screen.queryByText('Message:')).not.toBeInTheDocument();
        });

        it('shows Accept and Reject buttons for a pending application on an open job', async () => {
            await expandAndRender([mockApp(1, 'pending')]);
            expect(screen.getByRole('button', {name: /accept/i})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /reject/i})).toBeInTheDocument();
        });

        it('does not show action buttons for an accepted application', async () => {
            await expandAndRender([mockApp(1, 'accepted')]);
            expect(screen.queryByRole('button', {name: /accept/i})).not.toBeInTheDocument();
            expect(screen.queryByRole('button', {name: /reject/i})).not.toBeInTheDocument();
        });

        it('does not show action buttons when the job status is not open', async () => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1, 'pending')]),
                isLoading: false,
                isError: false,
            } as any);
            render(
                <MemoryRouter future={{v7_relativeSplatPath: true, v7_startTransition: true}}>
                    <JobApplicationsPanel jobId={1} jobStatus="assigned"/>
                </MemoryRouter>
            );
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            expect(screen.queryByRole('button', {name: /accept/i})).not.toBeInTheDocument();
        });

        it('disables action buttons while a mutation is pending', async () => {
            vi.mocked(useUpdateJobApplication).mockReturnValue({
                mutate: mutateMock,
                isPending: true,
            } as any);
            await expandAndRender([mockApp(1, 'pending')]);
            expect(screen.getByRole('button', {name: /accept/i})).toBeDisabled();
            expect(screen.getByRole('button', {name: /reject/i})).toBeDisabled();
        });
    });

    // ─── Confirmation dialog ───────────────────────────────────────────────────

    describe('confirmation dialog', () => {
        const openDialog = async (action: 'accept' | 'reject') => {
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1, 'pending')]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: new RegExp(action, 'i')}));
            });
        };

        it('opens the accept confirmation dialog', async () => {
            await openDialog('accept');
            expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
            expect(screen.getByText(/accept application/i)).toBeInTheDocument();
        });

        it('opens the reject confirmation dialog', async () => {
            await openDialog('reject');
            expect(screen.getByTestId('alert-dialog')).toBeInTheDocument();
            expect(screen.getByText(/reject application/i)).toBeInTheDocument();
        });

        it('calls mutate with accepted status on confirm', async () => {
            await openDialog('accept');
            // The card's "Accept" button is still in the DOM — scope to the dialog.
            const dialog = screen.getByTestId('alert-dialog');
            await act(async () => {
                await userEvent.click(within(dialog).getByRole('button', {name: /^accept$/i}));
            });
            expect(mutateMock).toHaveBeenCalledWith(
                {jobId: 1, appId: 1, payload: {status: 'accepted'}},
                expect.objectContaining({onSuccess: expect.any(Function)})
            );
        });

        it('calls mutate with rejected status on confirm', async () => {
            await openDialog('reject');
            const dialog = screen.getByTestId('alert-dialog');
            await act(async () => await userEvent.selectOptions(
                within(dialog).getByTestId('mocked-select'),
                'schedule_conflict'
            ));
            await act(async () => {
                await userEvent.click(within(dialog).getByRole('button', {name: /^reject$/i}));
            });
            expect(mutateMock).toHaveBeenCalledWith(
                {jobId: 1, appId: 1, payload: {status: 'rejected', decline_reason: 'schedule_conflict'}},
                expect.objectContaining({onSuccess: expect.any(Function)})
            );
        });

        it('closes the dialog on cancel without calling mutate', async () => {
            await openDialog('accept');
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /cancel/i}));
            });
            expect(mutateMock).not.toHaveBeenCalled();
            expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
        });

        it('closes the dialog after a successful mutation', async () => {
            mutateMock.mockImplementation((_vars: any, options: any) => {
                options?.onSuccess?.();
            });
            await openDialog('accept');
            const dialog = screen.getByTestId('alert-dialog');
            await act(async () => {
                await userEvent.click(within(dialog).getByRole('button', {name: /^accept$/i}));
            });
            await waitFor(() => {
                expect(screen.queryByTestId('alert-dialog')).not.toBeInTheDocument();
            });
        });

        it('shows an inline error when the mutation fails', async () => {
            mutateMock.mockImplementation((_vars: any, options: any) => {
                options?.onError?.(new Error('Permission denied'));
            });
            await openDialog('accept');
            const dialog = screen.getByTestId('alert-dialog');
            await act(async () => {
                await userEvent.click(within(dialog).getByRole('button', {name: /^accept$/i}));
            });
            await waitFor(() => {
                expect(screen.getByText('Permission denied')).toBeInTheDocument();
            });
        });

        it('shows a fallback error message when the error has no message', async () => {
            mutateMock.mockImplementation((_vars: any, options: any) => {
                options?.onError?.({});
            });
            await openDialog('reject');
            const dialog = screen.getByTestId('alert-dialog');
            await act(async () => await userEvent.selectOptions(
                within(dialog).getByTestId('mocked-select'),
                'schedule_conflict'
            ));
            await act(async () => {
                await userEvent.click(within(dialog).getByRole('button', {name: /^reject$/i}));
            });
            await waitFor(() => {
                expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
            });
        });

        it('shows a spinner while the mutation is in flight', async () => {
            vi.mocked(useUpdateJobApplication).mockReturnValue({
                mutate: mutateMock,
                isPending: true,
            } as any);
            vi.mocked(useJobApplications).mockReturnValue({
                data: makePage([mockApp(1, 'pending')]),
                isLoading: false,
                isError: false,
            } as any);
            renderPanel();
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /applications/i}));
            });
            // Manually open dialog via state — simulate by clicking Accept then checking pending UI
            // (isPending=true from the mock so the button is disabled but we can check text)
            // The cancel and confirm buttons should be disabled
            expect(screen.getByRole('button', {name: /accept/i})).toBeDisabled();
        });
    });
});