const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * API client for backend communication
 */
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('auth_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

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
    return this.request('/api/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  // Spotify endpoints
  async getSpotifyAuthUrl() {
    return this.request('/api/spotify/connect', { method: 'GET' });
  }

  async getTempToken(token) {
    return this.request(`/api/spotify/temp-token/${token}`, { method: 'GET' });
  }

  async getCurrentPlaying() {
    return this.request('/api/spotify/current-playing');
  }

  async getTopTracks(timeRange = 'short_term') {
    const q = encodeURIComponent(timeRange);
    return this.request(`/api/spotify/top-tracks?time_range=${q}`);
  }

  async getWrappedTopTracks() {
    return this.request('/api/spotify/wrapped-top-tracks');
  }

  async getGlobalTopTracks() {
    return this.request('/api/spotify/global-top-tracks');
  }

  async getFacultyTopTracks() {
    return this.request('/api/spotify/faculty-top-tracks');
  }

  async getFriendsTopTracks(friendIds = []) {
    const ids = Array.isArray(friendIds)
      ? friendIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const q = encodeURIComponent(ids.join(','));
    return this.request(`/api/spotify/friends-top-tracks?friend_ids=${q}`);
  }

  async getSharedPlaylists() {
    return this.request('/api/spotify/shared-playlists');
  }

  async createSharedPlaylist(name, friendIds = []) {
    return this.request('/api/spotify/shared-playlists', {
      method: 'POST',
      body: JSON.stringify({ name, friend_ids: friendIds })
    });
  }

  async renameSharedPlaylist(playlistId, name) {
    return this.request(`/api/spotify/shared-playlists/${encodeURIComponent(playlistId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
  }

  async deleteSharedPlaylist(playlistId) {
    return this.request(`/api/spotify/shared-playlists/${encodeURIComponent(playlistId)}`, {
      method: 'DELETE'
    });
  }

  async getFriendsTopTracks(friendIds = []) {
    const ids = Array.isArray(friendIds)
      ? friendIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const q = encodeURIComponent(ids.join(','));
    return this.request(`/api/spotify/friends-top-tracks?friend_ids=${q}`);
  }

  async getSharedPlaylists() {
    return this.request('/api/spotify/shared-playlists');
  }

  async createSharedPlaylist(name, friendIds = []) {
    return this.request('/api/spotify/shared-playlists', {
      method: 'POST',
      body: JSON.stringify({ name, friend_ids: friendIds })
    });
  }

  async renameSharedPlaylist(playlistId, name) {
    return this.request(`/api/spotify/shared-playlists/${encodeURIComponent(playlistId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
  }

  async deleteSharedPlaylist(playlistId) {
    return this.request(`/api/spotify/shared-playlists/${encodeURIComponent(playlistId)}`, {
      method: 'DELETE'
    });
  }

  async getFacultyTopTracks() {
    return this.request('/api/spotify/faculty-top-tracks');
  }

  // NEW: Get a specific user's cached Spotify stats
  async getUserSpotifyStats(userId) {
    return this.request(`/api/spotify/profile-stats/${encodeURIComponent(userId)}`);
  }

  // Following / Followers
  async searchUsers(query) {
    const q = encodeURIComponent(query || '');
    return this.request(`/api/follows/users/search?q=${q}`);
  }

  async followUser(userId) {
    return this.request(`/api/follows/${encodeURIComponent(userId)}`, { method: 'POST' });
  }

  async unfollowUser(userId) {
    return this.request(`/api/follows/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  }

  async getFollowing() {
    return this.request('/api/follows/following/list');
  }

  async getFollowers() {
    return this.request('/api/follows/followers/list');
  }

  async getFollowStatus(userId) {
    return this.request(`/api/follows/status/${encodeURIComponent(userId)}`);
  }

  // Legacy friends endpoints
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
    return this.request(`/api/friends/requests/${requestId}/accept`, { method: 'POST' });
  }

  async declineFriendRequest(requestId) {
    return this.request(`/api/friends/requests/${requestId}/decline`, { method: 'POST' });
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
    return this.request(`/api/follows/profile/${encodeURIComponent(userId)}`);
  }

  async updateProfile(payload) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // Feed endpoints
  async getFeedPosts() {
    return this.request('/api/feed');
  }

  async postToFeed(postData) {
    return this.request('/api/feed', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async deleteFeedPost(postId) {
    return this.request(`/api/feed/${postId}`, { method: 'DELETE' });
  }
}

export default new ApiClient();