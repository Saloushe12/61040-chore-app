import api from './api';

export const authService = {
  async register(email, password, displayName, role = 'patron') {
    const response = await api.post('/auth/register', {
      email,
      password,
      displayName,
      role
    });
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data.user;
  },

  async updateProfile(displayName, homeArea) {
    const response = await api.patch('/auth/me', { displayName, homeArea });
    return response.data.user;
  },

  logout() {
    localStorage.removeItem('token');
  }
};
