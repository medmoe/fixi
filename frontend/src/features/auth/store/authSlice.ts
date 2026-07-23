import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type AuthState} from '../types/auth.types';


export const initialAuthState: AuthState = {
    accessToken: null,
    isAuthenticated: false,
    isLoading: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState: initialAuthState,
    reducers: {
        setCredentials: (state, action: PayloadAction<string>) => {
            state.accessToken = action.payload
            state.isAuthenticated = true
            state.isLoading = false
        },
        clearCredentials: (state) => {
            state.accessToken = null
            state.isAuthenticated = false
            state.isLoading = false
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
    }
})

export const {setCredentials, clearCredentials, setLoading} = authSlice.actions
export default authSlice.reducer