import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  restored: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearAuth: () => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      restored: false,

      login: async (email: string, password: string) => {
        const response = await api.post<{ user: AuthUser }>('/auth/login', {
          email,
          password,
        });
        set({ user: response.data.user });
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // El token ya no es válido; se limpia igualmente la sesión local.
        }
        set({ user: null });
      },

      restoreSession: async () => {
        try {
          const response = await api.get<AuthUser>('/auth/profile');
          set({ user: response.data });
        } catch {
          set({ user: null });
        } finally {
          set({ restored: true });
        }
      },

      clearAuth: () => set({ user: null }),

      setUser: (user) => set({ user }),
    }),
    {
      name: 'erp-auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);