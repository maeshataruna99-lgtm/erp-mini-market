import { defineStore } from 'pinia';
import type { AuthResponse, User } from '@/types';

const ACCESS_KEY = 'minierp_access';
const REFRESH_KEY = 'minierp_refresh';
const USER_KEY = 'minierp_user';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem(ACCESS_KEY) ?? '',
    refreshToken: localStorage.getItem(REFRESH_KEY) ?? '',
    user: JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    isAdmin: (state) => state.user?.role === 'ADMIN',
    isManager: (state) => state.user?.role === 'ADMIN' || state.user?.role === 'MANAGER',
  },

  actions: {
    setTokens(accessToken: string, refreshToken: string) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      localStorage.setItem(ACCESS_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    },

    setUser(user: User) {
      this.user = user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    login(data: AuthResponse) {
      this.setTokens(data.accessToken, data.refreshToken);
      this.setUser(data.user);
    },

    logout() {
      this.accessToken = '';
      this.refreshToken = '';
      this.user = null;
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});
