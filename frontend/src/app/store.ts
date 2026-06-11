import { configureStore, createListenerMiddleware, isRejectedWithValue } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './apiSlice';
import { notificationsReducer, pushToast } from '../features/notifications/notificationsSlice';
import { systemReducer } from '../features/system/slice';
import { authReducer } from '../features/auth/authSlice';

const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  predicate: (action) => isRejectedWithValue(action),
  effect: (action, listenerApi) => {
    const status = action.payload?.status ?? 'error';
    const endpointName = action.meta?.arg?.endpointName as string | undefined;
    if (status === 404 && endpointName === 'getJobReview') {
      return;
    }
    const message = action.payload?.data?.detail ?? 'Request failed. Please try again.';

    listenerApi.dispatch(
      pushToast({
        message: `${status}: ${message}`,
        tone: 'error'
      })
    );
  }
});

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: authReducer,
    notifications: notificationsReducer,
    system: systemReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, listenerMiddleware.middleware)
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
