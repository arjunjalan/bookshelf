import client from './client'

export const socialApi = {
  // Profile
  getMyProfile: () => client.get('/profile/me'),
  createProfile: (data) => client.post('/profile', data),
  updateProfile: (data) => client.patch('/profile', data),
  checkHandle: (handle) => client.get('/profile/handle-check', { params: { handle } }),

  // Users
  getUserProfile: (handle) => client.get(`/users/${handle}`),
  searchUsers: (q) => client.get('/users/search', { params: { q } }),
  followUser: (handle) => client.post(`/users/${handle}/follow`),
  unfollowUser: (handle) => client.delete(`/users/${handle}/follow`),

  // Feed
  getFeed: (cursor, limit = 20) =>
    client.get('/feed', { params: cursor ? { cursor, limit } : { limit } }),
}
