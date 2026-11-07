import { api } from './api';
import { UserSettingsData, AnalyticsData } from '../types';

export const settingsService = {
  async getSettings(): Promise<UserSettingsData> {
    const res = await api.get<UserSettingsData>('/settings');
    return res.data;
  },

  async updateSettings(settings: Partial<UserSettingsData> & { custom_gemini_key?: string }): Promise<UserSettingsData> {
    const res = await api.put<UserSettingsData>('/settings', settings);
    return res.data;
  },
};

export const analyticsService = {
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await api.get<AnalyticsData>('/analytics');
    return res.data;
  },
};
