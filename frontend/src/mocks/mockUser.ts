import {vi} from 'vitest';
import {UseQueryResult} from '@tanstack/react-query';

export const mockUseUser = (overrides: Partial<UseQueryResult<any, any>> = {}): UseQueryResult<any, any> => ({
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isError: false,
    isFetched: true,
    isFetchedAfterMount: true,
    isFetching: false,
    isInitialLoading: false,
    isLoading: false,
    isLoadingError: false,
    isPaused: false,
    isPending: false,
    isPlaceholderData: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: 'success',
    ...overrides,
} as UseQueryResult<any, any>);