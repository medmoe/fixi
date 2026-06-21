import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface NotificationsState {
  toasts: Toast[];
}

const initialState: NotificationsState = {
  toasts: []
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    pushToast: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.toasts.push(action.payload);
      },
      prepare: (payload: Omit<Toast, 'id'>) => ({
        payload: {
          id: nanoid(),
          ...payload
        }
      })
    },
    dismissToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    }
  }
});

export const { pushToast, dismissToast, clearToasts } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
