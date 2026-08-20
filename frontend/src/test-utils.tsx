import {PropsWithChildren} from 'react';
import {Provider} from 'react-redux';
import {configureStore} from '@reduxjs/toolkit';
import authReducer from '@/features/auth/store/authSlice';
import userReducer from '@/features/user/userSlice'
import type {RootState} from '@/store';

export const createTestStore = (preloadedState?: Partial<RootState>) =>
    configureStore({
        reducer: {
            auth: authReducer,
            user: userReducer,
        },
        preloadedState: preloadedState as RootState | undefined,
    });

export const TestProvider = ({children}: PropsWithChildren) => {
    const store = createTestStore();
    return <Provider store={store}>{children}</Provider>;
};
