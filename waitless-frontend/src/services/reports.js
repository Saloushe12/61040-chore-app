import api from './api';

export const reportsService = {
  async submitWaitReport(venueId, reportData) {
    const response = await api.post('/reports/wait', {
      venueId,
      reportedWaitMinutes: reportData.reportedWaitMinutes,
      latitude: reportData.location.latitude,
      longitude: reportData.location.longitude
    });
    return response.data;
  },

  async submitVibeReport(venueId, reportData) {
    const response = await api.post('/reports/vibe', {
      venueId,
      crowdDensity: reportData.crowdDensity,
      noiseLevel: reportData.noiseLevel,
      energyLevel: reportData.energyLevel,
      musicTags: reportData.musicTags,
      latitude: reportData.location.latitude,
      longitude: reportData.location.longitude
    });
    return response.data;
  },

  async getReportHistory(limit = 20) {
    const response = await api.get('/reports/history', { params: { limit } });
    return response.data;
  }
};
