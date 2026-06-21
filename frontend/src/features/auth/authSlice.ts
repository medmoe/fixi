import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserRead } from './types';

interface AuthState {
  accessToken: string | null;
  user: UserRead | null;
}

const initialState: AuthState = {
  accessToken: null,
  user: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ accessToken: string }>) => {
      state.accessToken = action.payload.accessToken;
    },
    setUser: (state, action: PayloadAction<UserRead | null>) => {
      state.user = action.payload;
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.user = null;
    }
  }
});

export const { setCredentials, setUser, clearCredentials } = authSlice.actions;
export const authReducer = authSlice.reducer;
