import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SystemUiState {
  selectedSystemId: string | null;
}

const initialState: SystemUiState = {
  selectedSystemId: null
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    selectSystem: (state, action: PayloadAction<string | null>) => {
      state.selectedSystemId = action.payload;
    }
  }
});

export const { selectSystem } = systemSlice.actions;
export const systemReducer = systemSlice.reducer;
