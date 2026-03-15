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

  async getCurrentPlaying() {
    return this.request('/api/spotify/current-playing');
  }

  // --- NEW ADDITION ---
  // Sends a song to the global feed
  async postToFeed(postData) {
    return this.request('/api/feed', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  // Friends endpoints
  async searchUsers(query) {
    const q = encodeURIComponent(query || '');
    return this.request(`/api/friends/users/search?q=${q}`);
  }

  async sendFriendRequest(receiverId) {
    return this.request('/api/friends/requests', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId })
    });
  }

  async getFriendRequests() {
    return this.request('/api/friends/requests');
  }

  async acceptFriendRequest(requestId) {
    return this.request(`/api/friends/requests/${requestId}/accept`, {
      method: 'POST'
    });
  }

  async declineFriendRequest(requestId) {
    return this.request(`/api/friends/requests/${requestId}/decline`, {
      method: 'POST'
    });
  }

  async getFriends() {
    return this.request('/api/friends');
  }

  async getFriendsActivity() {
    return this.request('/api/friends/activity');
  }

  async getFriendStatus(userId) {
    return this.request(`/api/friends/check/${encodeURIComponent(userId)}`);
  }

  async getUserProfile(userId) {
    return this.request(`/api/friends/profile/${encodeURIComponent(userId)}`);
  }

  async getSpotifyTopTracks() {
    return this.request('/api/spotify/top-tracks');
  }

  /** Top tracks for wrapped page; time_range: short_term | medium_term | long_term */
  async getTopTracks(timeRange = 'medium_term') {
    const q = encodeURIComponent(timeRange);
    return this.request(`/api/spotify/top-tracks?time_range=${q}`);
  }

  /** Campus/global top tracks from wrapped aggregation */
  async getGlobalTopTracks() {
    return this.request('/api/spotify/global-top-tracks');
  }

  /** User's saved wrapped snapshot (for playlist fallback when no state) */
  async getWrappedTopTracks() {
    return this.request('/api/spotify/wrapped-top-tracks');
  }

  async getSpotifyTopArtists() {
    return this.request('/api/spotify/top-artists');
  }

  async getSpotifyStats() {
    return this.request('/api/spotify/stats');
  }

  
  async postToFeed(postData) {
    return this.request('/api/feed', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  
  // Fetches posts for the galaxy canvas
  async getFeedPosts() {
    return this.request('/api/feed', { method: 'GET' });
  }

  // Deletes a specific post from the user's orbit
  async deleteFeedPost(postId) {
    return this.request(`/api/feed/${postId}`, { method: 'DELETE' });
  }
  
}

export default new ApiClient();