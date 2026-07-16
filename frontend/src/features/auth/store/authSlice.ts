import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type AuthState} from '../types/auth.types';


export const initialAuthState: AuthState = {
    accessToken: sessionStorage.getItem('accessToken'),
    isAuthenticated: !!sessionStorage.getItem('accessToken'),
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
            sessionStorage.setItem('accessToken', action.payload)
        },
        clearCredentials: (state) => {
            state.accessToken = null
            state.isAuthenticated = false
            state.isLoading = false
            sessionStorage.removeItem('accessToken')
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
    }
})

export const {setCredentials, clearCredentials, setLoading} = authSlice.actions
export default authSlice.reducer