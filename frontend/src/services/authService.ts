import { api } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return res.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return res.data;
  },

  async googleAuth(payload?: { credential?: string; email?: string; full_name?: string; avatar_url?: string }): Promise<AuthResponse> {
    const savedEmail = localStorage.getItem('last_google_email');
    const savedName = localStorage.getItem('last_google_name');
    const finalPayload = payload || {
      email: savedEmail || 'abc4e123@gmail.com',
      full_name: savedName || 'Aditya',
    };
    const res = await api.post<AuthResponse>('/auth/google', finalPayload);
    return res.data;
  },

  async getCurrentUser(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    const res = await api.post<{ message: string; reset_token?: string }>('/auth/forgot-password', {
      email,
    });
    return res.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      new_password: newPassword,
    });
    return res.data;
  },

  async getConfig(): Promise<{ google_client_id?: string }> {
    try {
      const res = await api.get<{ google_client_id?: string }>('/auth/config');
      return res.data;
    } catch {
      return {};
    }
  },
};
