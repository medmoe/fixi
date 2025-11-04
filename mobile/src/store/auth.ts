import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type Profile = {
  id?: string | number;
  name?: string;
  username?: string;
  email?: string;
};

const TOKEN_KEY = 'auth_token';

type AuthState = {
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  setToken: (token: string | null) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
  setLoading: (value: boolean) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  profile: null,
  loading: false,
  setLoading: (value) => set({ loading: value }),
  setProfile: (profile) => set({ profile }),
  setToken: async (token) => {
    set({ token });
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },
  hydrate: async () => {
    const existing = await SecureStore.getItemAsync(TOKEN_KEY);
    if (existing) set({ token: existing });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null, profile: null });
  },
}));
