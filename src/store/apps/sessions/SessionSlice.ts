// src/store/apps/sessions/SessionSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosServices from 'src/utils/axios'; 
import { SessionType } from 'src/types/apps/session';

interface StateType {
  sessions: SessionType[];
  maxSessionsReached: boolean;
}

const initialState: StateType = {
  sessions: [],
  maxSessionsReached: false,
};

export const fetchSessions = createAsyncThunk(
  'session/fetchSessions',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosServices.get('/api/sessions');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error || 'Failed to fetch sessions');
    }
  }
);

export const createSession = createAsyncThunk(
  'session/createSession',
  async (
    sessionData: { status: string; category?: string; products?: string; keywords?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await axiosServices.post('/api/sessions', sessionData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error || 'Failed to create session');
    }
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    updateSession: (state, action: PayloadAction<{ sessionId: number; changes: Partial<SessionType> }>) => {
      const { sessionId, changes } = action.payload;
      const index = state.sessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        state.sessions[index] = { ...state.sessions[index], ...changes };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSessions.fulfilled, (state, action) => {
        state.sessions = action.payload;
      })
      .addCase(createSession.fulfilled, (state) => {
        state.maxSessionsReached = false;
      })
      .addCase(createSession.rejected, (state) => {
        state.maxSessionsReached = true;
      });
  },
});

export const { updateSession } = sessionSlice.actions;
export default sessionSlice.reducer;
