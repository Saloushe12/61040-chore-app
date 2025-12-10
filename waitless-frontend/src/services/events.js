import api from './api';

export const eventsService = {
  async getEvents(filters = {}) {
    const response = await api.get('/events', { params: filters });
    return response.data.events;
  },

  async createEvent(eventData) {
    const response = await api.post('/events', eventData);
    return response.data.event;
  },

  async updateEvent(id, eventData) {
    const response = await api.patch(`/events/${id}`, eventData);
    return response.data.event;
  },

  async cancelEvent(id) {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  async markEventInProgress(id) {
    const response = await api.patch(`/events/${id}`, { status: 'in_progress' });
    return response.data.event;
  }
};
