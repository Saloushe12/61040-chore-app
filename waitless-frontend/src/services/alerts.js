import api from './api';

export const alertsService = {
  async getAlerts() {
    const response = await api.get('/alerts');
    return response.data.subscriptions;
  },

  async createAlert(venueId, condition) {
    const response = await api.post('/alerts', { venueId, condition });
    return response.data.subscription;
  },

  async updateAlert(id, updates) {
    const response = await api.patch(`/alerts/${id}`, updates);
    return response.data.subscription;
  },

  async deleteAlert(id) {
    const response = await api.delete(`/alerts/${id}`);
    return response.data;
  }
};
