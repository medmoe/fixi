import {createSlice, type PayloadAction, createSelector} from "@reduxjs/toolkit";
import {RootState} from "@/store";

interface LocationState {
    displayLocation?: string | null,
    latitude?: number | null,
    longitude?: number | null,
}

const initialLocationState: LocationState = {
    displayLocation: null,
    latitude: null,
    longitude: null
}

const userSlice = createSlice({
    name: 'user',
    initialState: initialLocationState,
    reducers: {
        setLocation: (
            state: LocationState,
            action: PayloadAction<LocationState>
        ) => {
            state.displayLocation = action.payload.displayLocation;
            state.latitude = action.payload.latitude;
            state.longitude = action.payload.longitude
        },
        clearLocation: (state: LocationState) => {
            state.displayLocation = null;
            state.latitude = null;
            state.longitude = null;
        }
    }
})
export const selectUserLocation = createSelector(
    [(state: { user: LocationState }) => state.user.displayLocation,
     (state: { user: LocationState }) => state.user.latitude,
     (state: { user: LocationState }) => state.user.longitude],
    (displayLocation, latitude, longitude) => ({ displayLocation, latitude, longitude })
);

export const selectHasLocation = (state: RootState) => state.user.latitude !== null && state.user.longitude !== null

export const {setLocation, clearLocation} = userSlice.actions
export default userSlice.reducer