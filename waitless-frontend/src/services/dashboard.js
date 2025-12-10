import api from './api';

export const dashboardService = {
  async getVenueDashboard() {
    const response = await api.get('/venues/dashboard');
    return response.data;
  },

  async updateVenueStatus(venueId, status) {
    const response = await api.patch(`/venues/${venueId}/status`, { status });
    return response.data;
  },

  async claimVenue(venueId) {
    const response = await api.post(`/venues/${venueId}/claim`);
    return response.data;
  }
};
