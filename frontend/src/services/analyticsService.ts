import { api } from './api';
import type { AnalyticsData } from '../types';

export const analyticsService = {
  async getAnalytics(): Promise<AnalyticsData> {
    const res = await api.get<AnalyticsData>('/analytics');
    return res.data;
  },
};
