import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {act} from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {LocationPicker} from '@/features/customer/components/LocationPicker';
import {useReverseGeocode} from '../../hooks/useReverseGeocode';
import {useLocationSearch, useUpdateUser} from '@/features/user';
import userReducer from '@/features/user/userSlice';

vi.mock('../../hooks/useReverseGeocode');
vi.mock('@/features/user', () => ({
    useLocationSearch: vi.fn(),
    useUpdateUser: vi.fn()
}));

const mockSuggestions = [
    {id: '1', display_name: 'New York, NY, United States', latitude: 40.7128, longitude: -74.006},
];

const mutateMock = vi.fn();

const createWrapper = () => {
    const queryClient = new QueryClient({defaultOptions: {queries: {retry: false}, mutations: {retry: false}}});
    const store = configureStore({reducer: {user: userReducer}});
    return ({children}: { children: React.ReactNode }) => (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </Provider>
    );
};

describe('LocationPicker', () => {
    let getCurrentPositionMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useUpdateUser).mockReturnValue({
            mutate: mutateMock,
            isPending: false,
        } as never);

        vi.mocked(useReverseGeocode).mockReturnValue({
            data: undefined,
            isFetching: false,
        } as never);

        vi.mocked(useLocationSearch).mockReturnValue({
            suggestions: [],
            isFetching: false,
            isError: false,
            searchTerm: '',
        } as never);

        getCurrentPositionMock = vi.fn();
        Object.defineProperty(global.navigator, 'geolocation', {
            value: {getCurrentPosition: getCurrentPositionMock},
            configurable: true,
        });
    });

    // ------------------------------------------------------------------ //
    //  Rendering                                                           //
    // ------------------------------------------------------------------ //

    describe('rendering', () => {
        it('renders the Use my location button', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => expect(screen.getByRole('button', {name: /use my location/i})).toBeInTheDocument())
        });

        it('renders the manual search field', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
        });

        it('renders hidden latitude and longitude fields', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => {
                expect(screen.getByTestId('latitude-field')).toBeInTheDocument();
                expect(screen.getByTestId('longitude-field')).toBeInTheDocument();
            })
        });

        it('hidden fields start empty', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => {
                expect(screen.getByTestId('latitude-field')).toHaveValue('');
                expect(screen.getByTestId('longitude-field')).toHaveValue('');
            })
        });

        it('submit button is disabled when no location is set', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => expect(screen.getByRole('button', {name: /confirm location/i})).toBeDisabled());
        });
    });

    // ------------------------------------------------------------------ //
    //  Use my location — success                                          //
    // ------------------------------------------------------------------ //

    describe('geolocation success', () => {
        it('calls navigator.geolocation.getCurrentPosition on click', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });
            expect(getCurrentPositionMock).toHaveBeenCalled();
        });

        it('populates hidden fields after a successful geolocation + reverse geocode', async () => {
            getCurrentPositionMock.mockImplementation((onSuccess) => {
                onSuccess({coords: {latitude: 36.7538, longitude: 3.0588}});
            });
            vi.mocked(useReverseGeocode).mockReturnValue({
                data: 'Algiers, Algeria',
                isFetching: false,
            } as never);

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByTestId('latitude-field')).toHaveValue('36.7538');
                expect(screen.getByTestId('longitude-field')).toHaveValue('3.0588');
            });
        });

        it('enables the confirm button once coordinates are captured', async () => {
            getCurrentPositionMock.mockImplementation((onSuccess) => {
                onSuccess({coords: {latitude: 36.7538, longitude: 3.0588}});
            });
            vi.mocked(useReverseGeocode).mockReturnValue({
                data: 'Algiers, Algeria',
                isFetching: false,
            } as never);

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole('button', {name: /confirm location/i})).not.toBeDisabled();
            });
        });
    });

    // ------------------------------------------------------------------ //
    //  Use my location — errors                                           //
    // ------------------------------------------------------------------ //

    describe('geolocation errors', () => {
        it('shows a denied message when permission is denied', async () => {
            getCurrentPositionMock.mockImplementation((_success, onError) => {
                onError({code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3});
            });

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/location access was denied/i);
            });
        });

        it('shows a timeout message on geolocation timeout', async () => {
            getCurrentPositionMock.mockImplementation((_success, onError) => {
                onError({code: 3, PERMISSION_DENIED: 1, TIMEOUT: 3});
            });

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/could not get your location in time/i);
            });
        });

        it('shows an unavailable message when geolocation API is missing', async () => {
            Object.defineProperty(global.navigator, 'geolocation', {
                value: undefined,
                configurable: true,
            });

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/location services are unavailable/i);
            });
        });

        it('manual search field remains available after a geolocation error', async () => {
            getCurrentPositionMock.mockImplementation((_success, onError) => {
                onError({code: 1, PERMISSION_DENIED: 1, TIMEOUT: 3});
            });

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /use my location/i}));
            });

            await waitFor(() => {
                expect(screen.getByRole('alert')).toBeInTheDocument();
            });
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });
    });

    // ------------------------------------------------------------------ //
    //  Manual address selection                                           //
    // ------------------------------------------------------------------ //

    describe('manual address selection', () => {
        it('populates hidden fields after selecting a suggestion', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('option', {name: /new york, ny/i}));
            });

            await waitFor(() => {
                expect(screen.getByTestId('latitude-field')).toHaveValue('40.7128');
                expect(screen.getByTestId('longitude-field')).toHaveValue('-74.006');
            });
        });
    });

    // ------------------------------------------------------------------ //
    //  Confirm submission                                                  //
    // ------------------------------------------------------------------ //

    describe('confirm submission', () => {
        it('calls updateLocation with the captured coordinates on submit', async () => {
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('option', {name: /new york, ny/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /confirm location/i}));
            });

            await waitFor(() => {
                expect(mutateMock).toHaveBeenCalledWith(
                    expect.objectContaining({
                        display_location: 'New York, NY, United States',
                        latitude: 40.7128,
                        longitude: -74.006,
                    }),
                    expect.objectContaining({onSuccess: expect.any(Function)})
                );
            });
        });

        it('calls onConfirmed callback after successful save', async () => {
            const onConfirmed = vi.fn();
            mutateMock.mockImplementation((_payload, options) => {
                options?.onSuccess?.();
            });
            vi.mocked(useLocationSearch).mockReturnValue({
                suggestions: mockSuggestions,
                isFetching: false,
                isError: false,
                searchTerm: 'New York',
            } as never);

            render(<LocationPicker username="john_doe" onConfirmed={onConfirmed}/>, {wrapper: createWrapper()});

            await act(async () => {
                await userEvent.type(screen.getByRole('combobox'), 'New York');
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('option', {name: /new york, ny/i}));
            });
            await act(async () => {
                await userEvent.click(screen.getByRole('button', {name: /confirm location/i}));
            });

            await waitFor(() => {
                expect(onConfirmed).toHaveBeenCalled();
            });
        });

        it('shows saving state while the mutation is pending', async () => {
            vi.mocked(useUpdateUser).mockReturnValue({
                mutate: mutateMock,
                isPending: true,
            } as never);

            await act(async () => render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()}))
            expect(screen.getByText(/saving/i)).toBeInTheDocument();
        });

        it('does not submit when location is not set', async () => {
            render(<LocationPicker username="john_doe"/>, {wrapper: createWrapper()});
            await waitFor(() => {
                const submitButton = screen.getByRole('button', {name: /confirm location/i});
                expect(submitButton).toBeDisabled();
                expect(mutateMock).not.toHaveBeenCalled();
            })

        });
    });
});