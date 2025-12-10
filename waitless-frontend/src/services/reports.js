import api from './api';

export const reportsService = {
  async submitWaitReport(venueId, reportData) {
    const payload = {
      venueId,
      reportedWaitMinutes: reportData.reportedWaitMinutes,
      latitude: reportData.location.latitude,
      longitude: reportData.location.longitude
    };
    // Only include anonymous flag if true (backend handles null userId)
    if (reportData.anonymous) {
      payload.anonymous = true;
    }
    const response = await api.post('/reports/wait', payload);
    return response.data;
  },

  async submitVibeReport(venueId, reportData) {
    const payload = {
      venueId,
      crowdDensity: reportData.crowdDensity,
      noiseLevel: reportData.noiseLevel,
      energyLevel: reportData.energyLevel,
      musicTags: reportData.musicTags,
      latitude: reportData.location.latitude,
      longitude: reportData.location.longitude
    };
    // Only include anonymous flag if true (backend handles null userId)
    if (reportData.anonymous) {
      payload.anonymous = true;
    }
    const response = await api.post('/reports/vibe', payload);
    return response.data;
  },

  async getReportHistory(limit = 20) {
    const response = await api.get('/reports/history', { params: { limit } });
    return response.data;
  }
};
