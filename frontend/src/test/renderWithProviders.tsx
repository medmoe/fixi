// src/test/renderWithProviders.tsx

import React from 'react'
import {render, type RenderOptions} from '@testing-library/react'
import {MemoryRouter, type MemoryRouterProps} from 'react-router-dom'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {Provider} from 'react-redux'
import {configureStore} from '@reduxjs/toolkit'
import authReducer, {initialAuthState} from '@/features/auth/store/authSlice'
import userReducer, {initialLocationState} from '@/features/user/userSlice'
import type {RootState} from '@/store'

// ─── create isolated store per test ──────────────────────────────────────────
const defaultState: RootState = {
    auth: initialAuthState,
    user: initialLocationState
}
export const createTestStore = (preloadedState?: Partial<RootState>) =>
    configureStore({
        reducer: {auth: authReducer, user: userReducer},
        preloadedState: {
            ...defaultState,
            ...preloadedState,
        }
    })

// ─── create isolated query client per test ───────────────────────────────────

export const createTestQueryClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: {retry: false},
            mutations: {retry: false},
        },
    })

// ─── wrapper options ──────────────────────────────────────────────────────────

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
    preloadedState?: Partial<RootState>
    routerProps?: MemoryRouterProps
}

export const renderWithProviders = (
    ui: React.ReactElement,
    options: RenderWithProvidersOptions = {},
) => {
    const {preloadedState, routerProps, ...renderOptions} = options

    const store = createTestStore(preloadedState)
    const queryClient = createTestQueryClient()

    const Wrapper = ({children}: { children: React.ReactNode }) => (
        <Provider store={store}>
            <QueryClientProvider client={queryClient}>
                <MemoryRouter {...routerProps}>
                    {children}
                </MemoryRouter>
            </QueryClientProvider>
        </Provider>
    )

    return {
        ...render(ui, {wrapper: Wrapper, ...renderOptions}),
        store,
        queryClient,
    }
}