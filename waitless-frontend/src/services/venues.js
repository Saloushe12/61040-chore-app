import api from './api';

export const venuesService = {
  async getNearbyVenues(latitude, longitude, radius = 5000, tags = null) {
    const params = { latitude, longitude, radius };
    if (tags) params.tags = tags;

    const response = await api.get('/venues', { params });
    return response.data.venues;
  },

  async getVenueById(id) {
    const response = await api.get(`/venues/${id}`);
    return response.data;
  },

  async createVenue(venueData) {
    const response = await api.post('/venues', venueData);
    return response.data.venue;
  },

  async updateVenue(id, venueData) {
    const response = await api.patch(`/venues/${id}`, venueData);
    return response.data.venue;
  },

  async updateVenueStatus(id, status) {
    const response = await api.patch(`/venues/${id}/status`, { status });
    return response.data.venue;
  },

  async getVenueForecast(id, dayOfWeek = null) {
    const params = dayOfWeek !== null ? { dayOfWeek } : {};
    const response = await api.get(`/venues/${id}/forecast`, { params });
    return response.data;
  },

  async getSuggestedVenues(latitude, longitude, radius = 10000) {
    const params = { latitude, longitude, radius };
    const response = await api.get('/venues/suggested', { params });
    return response.data.suggestions;
  }
};
