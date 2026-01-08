import { create } from 'zustand';
import { api } from '@/lib/api';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isSetup: boolean;
  login: (passphrase: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  isSetup: false,

  login: async (passphrase: string) => {
    try {
      const response = await api.post('/auth/login', { passphrase });
      if (response.success) {
        set({ isAuthenticated: true });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout', {});
    } finally {
      set({ isAuthenticated: false });
    }
  },

  checkAuth: async () => {
    try {
      const status = await api.get<{ isSetup: boolean }>('/auth/status');
      set({ isSetup: status.isSetup, isLoading: false });

      // Try to access a protected resource to check if session is valid
      try {
        await api.get('/entries/today');
        set({ isAuthenticated: true });
      } catch {
        set({ isAuthenticated: false });
      }
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
