import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenStorage } from '@/services/auth/token-storage';
import { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  tokenScope: string;
  setSession: (input: { accessToken: string; scope: string; user?: AuthUser | null }) => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      tokenScope: '',
      setSession: ({ accessToken, scope, user }) => {
        tokenStorage.setAccessToken(accessToken, scope);
        set({
          user: user ?? null,
          tokenScope: scope,
          isAuthenticated: true,
        });
      },
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        tokenStorage.clear();
        set({ user: null, tokenScope: '', isAuthenticated: false });
      },
    }),
    {
      name: 'roadlyn.auth',
      partialize: (state) => ({
        user: state.user,
        tokenScope: state.tokenScope,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
