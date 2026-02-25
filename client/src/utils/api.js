const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API client for backend communication
 */
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get auth token from localStorage
   */
  getToken() {
    return localStorage.getItem('auth_token');
  }

  /**
   * Set auth token in localStorage
   */
  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  /**
   * Make authenticated request
   */
  async request(endpoint, options = {}) {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Auth endpoints
  async register(userData) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST'
    });
  }

  // To use in dashboard for user name
  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Spotify endpoints
  async getSpotifyAuthUrl() {
    return this.request('/api/spotify/connect', {
      method: 'GET'
    });
  }

  async getTempToken(token) {
    return this.request(`/api/spotify/temp-token/${token}`, {
      method: 'GET'
    });
  }
}

export default new ApiClient();
