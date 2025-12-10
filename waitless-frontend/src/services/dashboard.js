import api from './api';

export const dashboardService = {
  async getVenueDashboard() {
    const response = await api.get('/venues/operator/dashboard');
    return response.data;
  },

  async updateVenueStatus(venueId, status) {
    const response = await api.patch(`/venues/${venueId}/status`, { status });
    return response.data;
  },

  async claimVenue(venueId) {
    const response = await api.patch(`/venues/${venueId}/claim`);
    return response.data;
  },

  async updateVenueProfile(venueId, venueData) {
    const response = await api.patch(`/venues/${venueId}`, venueData);
    return response.data.venue;
  },

  async submitWaitOverride(venueId, waitMinutes) {
    const response = await api.post('/reports/wait/override', {
      venueId,
      waitMinutes
    });
    return response.data;
  }
};
