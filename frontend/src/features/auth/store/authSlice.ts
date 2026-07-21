import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type AuthState} from '../types/auth.types';
import {setAccessToken} from '@/lib/api/apiClient'


export const initialAuthState: AuthState = {
    accessToken: sessionStorage.getItem('access_token'),
    isAuthenticated: !!sessionStorage.getItem('access_token'),
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
            setAccessToken(action.payload)
        },
        clearCredentials: (state) => {
            state.accessToken = null
            state.isAuthenticated = false
            state.isLoading = false
            setAccessToken(null)
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
    }
})

export const {setCredentials, clearCredentials, setLoading} = authSlice.actions
export default authSlice.reducer