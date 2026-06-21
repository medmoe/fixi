import { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './app/apiSlice';
import { notificationsReducer } from './features/notifications/notificationsSlice';
import { systemReducer } from './features/system/slice';
import { authReducer } from './features/auth/authSlice';
import type { RootState } from './app/store';

export const createTestStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
      auth: authReducer,
      notifications: notificationsReducer,
      system: systemReducer
    },
    preloadedState: preloadedState as RootState | undefined,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware)
  });

export const TestProvider = ({ children }: PropsWithChildren) => {
  const store = createTestStore();
  return <Provider store={store}>{children}</Provider>;
};
