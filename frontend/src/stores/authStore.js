import { create } from 'zustand';
import * as authApi from '../api/auth';
import { useCartStore } from './cartStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      set({ token: access_token, isAuthenticated: true });
      await get().fetchUser();
      await useCartStore.getState().mergeLocalCartToBackend();
      return response.data;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (userData) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(userData);
      const { access_token } = response.data;
      if (access_token) {
        localStorage.setItem('token', access_token);
        set({ token: access_token, isAuthenticated: true });
        await get().fetchUser();
        await useCartStore.getState().mergeLocalCartToBackend();
      }
      return response.data;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
    useCartStore.getState().resetMemory();
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const response = await authApi.getMe();
      set({ user: response.data, isAuthenticated: true });
    } catch {
      get().logout();
    } finally {
      set({ isLoading: false });
    }
  },

  initialize: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
      await get().fetchUser();
      if (get().isAuthenticated) {
        await useCartStore.getState().syncWithBackend();
      }
    }
  },
}));
