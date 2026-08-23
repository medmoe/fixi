// JobTradeCategoryField.test.tsx
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {FormProvider, useForm} from 'react-hook-form';
import {JobTradeCategoryField} from '@/features/job';
import {useTrades} from '@/features/worker/hooks/useTrades.ts';

vi.mock('@/features/worker/hooks/useTrades');

const mockTrades = [
    {id: 1, name: 'Plumbing', display_name: 'Plumbing'},
    {id: 2, name: 'Electrical', display_name: 'Electrical'},
    {id: 3, name: 'Carpentry', display_name: 'Carpentry'},
];

const Wrapper = ({defaultValues = {}}: { defaultValues?: Record<string, unknown> }) => {
    const methods = useForm({defaultValues});
    return (
        <FormProvider {...methods}>
            <form>
                <JobTradeCategoryField/>
            </form>
        </FormProvider>
    );
};

describe('JobTradeCategoryField', () => {

    beforeEach(() => {
        vi.mocked(useTrades).mockReturnValue({
            data: mockTrades,
            isLoading: false,
        } as never);
    });

    // ------------------------------------------------------------------ //
    //  Rendering                                                           //
    // ------------------------------------------------------------------ //

    describe('rendering', () => {
        it('renders the Trade Category label', () => {
            render(<Wrapper/>);
            expect(screen.getByText('Trade Category')).toBeInTheDocument();
        });

        it('renders all available trades as buttons', () => {
            render(<Wrapper/>);
            expect(screen.getByRole('button', {name: /plumbing/i})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /electrical/i})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /carpentry/i})).toBeInTheDocument();
        });

        it('shows loading state when trades are fetching', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: true,
            } as never);
            render(<Wrapper/>);
            expect(screen.getByText(/loading trade categories/i)).toBeInTheDocument();
        });

        it('does not render trade buttons while loading', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: true,
            } as never);
            render(<Wrapper/>);
            expect(screen.queryByRole('button', {name: /plumbing/i})).not.toBeInTheDocument();
        });

        it('renders selected trade when default value is set', () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);
            expect(screen.getByText('Plumbing')).toBeInTheDocument();
            expect(screen.queryByRole('button', {name: /electrical/i})).not.toBeInTheDocument();
        });

        it('renders clear button when a trade is selected', () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument();
        });

        it('does not render clear button when no trade is selected', () => {
            render(<Wrapper/>);
            expect(screen.queryByRole('button', {name: /remove/i})).not.toBeInTheDocument();
        });

        it('hides trade list when a trade is selected', () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);

            // The selected trade display should be visible
            expect(screen.getByText(/plumbing/i)).toBeInTheDocument();

            // The "Remove" button should be visible
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument();

            // The selectable trade buttons should NOT be visible
            expect(screen.queryByRole('button', {name: /^plumbing$/i})).not.toBeInTheDocument();
            expect(screen.queryByRole('button', {name: /electrical/i})).not.toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Selecting a trade                                                   //
    // ------------------------------------------------------------------ //

    describe('selecting a trade', () => {
        it('shows the selected trade after clicking a trade button', async () => {
            render(<Wrapper/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /plumbing/i}));
            });
            expect(screen.getByText('Plumbing')).toBeInTheDocument();
        });

        it('hides the trade list after a trade is selected', async () => {
            render(<Wrapper/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /plumbing/i}));
            });
            expect(screen.queryByRole('button', {name: /electrical/i})).not.toBeInTheDocument();
        });

        it('shows the remove button after selecting a trade', async () => {
            render(<Wrapper/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /plumbing/i}));
            });
            expect(screen.getByRole('button', {name: /remove plumbing/i})).toBeInTheDocument();
        });

        it('can select a different trade after clearing', async () => {
            render(<Wrapper/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /plumbing/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /remove plumbing/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /electrical/i}));
            });
            expect(screen.getByText('Electrical')).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Clearing a trade                                                    //
    // ------------------------------------------------------------------ //

    describe('clearing a trade', () => {
        it('shows the trade list again after clearing', async () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /remove plumbing/i}));
            });
            expect(screen.getByRole('button', {name: /plumbing/i})).toBeInTheDocument();
            expect(screen.getByRole('button', {name: /electrical/i})).toBeInTheDocument();
        });

        it('removes the selected trade display after clearing', async () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);

            // Verify selected trade is initially shown
            const selectedDisplay = screen.getByText('Plumbing');
            expect(selectedDisplay).toBeInTheDocument();

            // Click remove
            await act(async () => await userEvent.click(screen.getByRole('button', {name: /remove plumbing/i})));

            // The selected trade display should be gone
            expect(screen.queryByLabelText(/remove plumbing/i)).not.toBeInTheDocument();

            // But the selectable Plumbing button should now be visible
            expect(screen.getByRole('button', {name: /plumbing/i})).toBeInTheDocument();
        });

        it('removes the clear button after clearing', async () => {
            render(<Wrapper defaultValues={{trade_category_id: 1}}/>);
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /remove plumbing/i}));
            });
            expect(screen.queryByRole('button', {name: /remove/i})).not.toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Edge cases                                                          //
    // ------------------------------------------------------------------ //

    describe('edge cases', () => {
        it('renders trade name when display_name is not available', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [{id: 4, name: 'Roofing', display_name: null}],
                isLoading: false,
            } as never);
            render(<Wrapper/>);
            expect(screen.getByRole('button', {name: /roofing/i})).toBeInTheDocument();
        });

        it('renders empty state gracefully when no trades are available', () => {
            vi.mocked(useTrades).mockReturnValue({
                data: [],
                isLoading: false,
            } as never);
            render(<Wrapper/>);
            expect(screen.getByText('Trade Category')).toBeInTheDocument();
            expect(screen.queryByRole('button', {name: /remove/i})).not.toBeInTheDocument();
        });
    });
});