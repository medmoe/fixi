// JobCreateForm.test.tsx
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {act} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {JobCreateForm} from '@/features/job';
import {useCreateJob} from "../hooks/useCreateJob"
import {useTrades} from '@/features/worker/hooks/useTrades';
import {useLocationSearch} from '@/features/user/hooks/useLocationSearch';

vi.mock('../hooks/useCreateJob');
vi.mock('@/features/worker/hooks/useTrades');
vi.mock('@/features/user/hooks/useLocationSearch');

const mockTrades = [
    {id: 1, name: 'Plumbing', display_name: 'Plumbing'},
    {id: 2, name: 'Electrical', display_name: 'Electrical'},
];

const mockSuggestions = [
    {
        id: '1',
        display_name: 'New York, NY, United States',
        latitude: 40.7128,
        longitude: -74.006,
    },
];

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
    });
    return ({children}: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

const mutateMock = vi.fn();

describe('JobCreateForm', () => {

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useCreateJob).mockReturnValue({
            mutate: mutateMock,
            isPending: false,
        } as never);

        vi.mocked(useTrades).mockReturnValue({
            data: mockTrades,
            isLoading: false,
        } as never);

        vi.mocked(useLocationSearch).mockReturnValue({
            suggestions: [],
            isFetching: false,
            isError: false,
            searchTerm: '',
        } as never);
    });

    // ------------------------------------------------------------------ //
    //  Rendering                                                           //
    // ------------------------------------------------------------------ //

    describe('rendering', () => {
        it('renders the form', () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByRole('form', {name: /create job form/i})).toBeInTheDocument();
        });

        it('renders all fields', () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByLabelText('Job Title')).toBeInTheDocument();
            expect(screen.getByLabelText('Job Description')).toBeInTheDocument();
            expect(screen.getByText('Trade Category')).toBeInTheDocument();
            expect(screen.getByText('Budget Range')).toBeInTheDocument();
            expect(screen.getByText('Location')).toBeInTheDocument();
        });

        it('renders the submit button', () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByRole('button', {name: /submit job/i})).toBeInTheDocument();
        });

        it('renders submit button with Post Job text', () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByRole('button', {name: /submit job/i})).toHaveTextContent('Post Job');
        });

        it('submit button is disabled on initial render', () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByRole('button', {name: /submit job/i})).toBeDisabled();
        });
    });

    // ------------------------------------------------------------------ //
    //  Pending state                                                       //
    // ------------------------------------------------------------------ //

    describe('pending state', () => {
        it('shows loading spinner and text when isPending', () => {
            vi.mocked(useCreateJob).mockReturnValue({
                mutate: mutateMock,
                isPending: true,
            } as never);
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByText(/creating job/i)).toBeInTheDocument();
        });

        it('disables the submit button when isPending', () => {
            vi.mocked(useCreateJob).mockReturnValue({
                mutate: mutateMock,
                isPending: true,
            } as never);
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            expect(screen.getByRole('button', {name: /submit job/i})).toBeDisabled();
        });
    });

    // ------------------------------------------------------------------ //
    //  Validation                                                          //
    // ------------------------------------------------------------------ //

    describe('validation', () => {
        it('shows title validation error when title is empty and field is touched', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            const titleInput = screen.getByLabelText('Job Title');
            await act(async () => {
                await userEvent.click(titleInput);
                await userEvent.tab();
            });
            await waitFor(() => {
                expect(screen.getByText(/at least 1/i)).toBeInTheDocument();
            });
        });

        it('does not enable submit when title is empty', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.type(screen.getByLabelText('Job Title'), 'a');
                await userEvent.clear(screen.getByLabelText('Job Title'));
            });
            expect(screen.getByRole('button', {name: /submit job/i})).toBeDisabled();
        });

        it('submit remains disabled when only title is filled without location', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.type(screen.getByLabelText('Job Title'), 'Fix sink');
            });
            expect(screen.getByRole('button', {name: /submit job/i})).toBeDisabled();
        });

        // it('shows budget validation error when max is less than min', async () => {
        //     render(<JobCreateForm/>, {wrapper: createWrapper()});
        //     const minInput = screen.getByLabelText('Minimum budget');
        //     const maxInput = screen.getByLabelText('Maximum budget');
        //     await act(async () => {
        //         await userEvent.type(minInput, '500');
        //         await userEvent.type(maxInput, '100');
        //         await userEvent.tab();
        //     });
        //     await waitFor(() => {
        //         expect(screen.getByText(/budget max must be greater/i)).toBeInTheDocument();
        //     });
        // });
    });

    // ------------------------------------------------------------------ //
    //  Submission                                                          //
    // ------------------------------------------------------------------ //

    describe('submission', () => {
        it('calls createJob with correct payload on valid submit', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<JobCreateForm/>, {wrapper: createWrapper()});

            // fill title
            await act(async () => {
                await userEvent.type(screen.getByLabelText('Job Title'), 'Fix leaking sink');
            });

            // select trade category
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /plumbing/i}));
            });

            // fill location and select suggestion
            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(
                    screen.getByRole('option', {name: /new york, ny/i})
                );
            });

            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit job/i}));
            });

            await waitFor(() => {
                expect(mutateMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        title: 'Fix leaking sink',
                        trade_category_id: 1,
                        latitude: 40.7128,
                        longitude: -74.006,
                    })
                );
            });
        });

        it('does not call createJob when form is invalid', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit job/i}));
            });
            expect(mutateMock).not.toHaveBeenCalled();
        });

        it('does not call createJob when form is pristine', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit job/i}));
            });
            expect(mutateMock).not.toHaveBeenCalled();
        });

        it('includes optional description in payload when filled', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<JobCreateForm/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByLabelText('Job Title'), 'Fix sink');
                await userEvent.type(screen.getByLabelText('Job Description'), 'Urgent repair needed');
            });
            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('option', {name: /new york, ny/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /submit job/i}));
            });

            await waitFor(() => {
                expect(mutateMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        description: 'Urgent repair needed',
                    })
                );
            });
        });
    });

    // ------------------------------------------------------------------ //
    //  Location interaction                                               //
    // ------------------------------------------------------------------ //

    describe('location field', () => {
        it('shows suggestions when user types in location field', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<JobCreateForm/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });

            expect(screen.getByRole('listbox')).toBeInTheDocument();
            expect(screen.getByRole('option', {name: /new york, ny/i})).toBeInTheDocument();
        });

        it('shows coordinates hint after selecting a location', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<JobCreateForm/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('option', {name: /new york, ny/i}));
            });

            await waitFor(() => {
                expect(screen.getByText(/coordinates/i)).toBeInTheDocument();
            });
        });

        it('shows unconfirmed hint when text is typed without selecting a suggestion', async () => {
            render(<JobCreateForm/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await waitFor(() => {
                expect(screen.getByText(/select a location from the suggestions/i)).toBeInTheDocument();
            });
        });
    });
});